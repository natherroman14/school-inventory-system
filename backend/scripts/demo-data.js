const apiUrl = process.env.DEMO_API_URL || 'http://localhost:5000/api'
const custodianUsername = process.env.DEMO_CUSTODIAN_USERNAME || 'custodian'
const custodianPassword = process.env.DEMO_CUSTODIAN_PASSWORD || 'Admin1234'
const deanUsername = process.env.DEMO_DEAN_USERNAME || 'dean'
const deanPassword = process.env.DEMO_DEAN_PASSWORD || 'Dean1234'

async function api(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const payload = await response.json()
  if (!response.ok || payload.success === false) {
    const error = new Error(payload.error?.message || `${method} ${path} failed`)
    error.status = response.status
    throw error
  }
  return payload
}

async function ignoreConflict(task) {
  try {
    return await task()
  } catch (error) {
    if (error.status === 409 || /already/i.test(error.message)) return null
    throw error
  }
}

async function getItems(token) {
  const response = await api('/inventory?limit=200', { token })
  return response.data || []
}

async function hasRequest(token, purpose) {
  const response = await api(`/requests?search=${encodeURIComponent(purpose)}&limit=100`, { token })
  return (response.data || []).some((request) => request.purpose === purpose)
}

async function main() {
  const admin = await api('/auth/login', {
    method: 'POST',
    body: { username: custodianUsername, password: custodianPassword },
  })
  const adminToken = admin.data.token

  await ignoreConflict(() => api('/users', {
    method: 'POST',
    token: adminToken,
    body: {
      fullName: 'Demo Dean',
      username: deanUsername,
      password: deanPassword,
      role: 'DEAN',
      department: 'Office of the Dean',
    },
  }))

  const heads = [
    ['head-education', 'Ana Reyes', 'College of Education'],
    ['head-engineering', 'Miguel Santos', 'College of Engineering'],
    ['head-business', 'Liza Dizon', 'College of Business and Accountancy'],
  ]
  for (const [username, fullName, department] of heads) {
    await ignoreConflict(() => api('/users', {
      method: 'POST',
      token: adminToken,
      body: { fullName, username, password: 'Head1234', role: 'PROGRAM_HEAD', department },
    }))
  }

  const dean = await api('/auth/login', {
    method: 'POST',
    body: { username: deanUsername, password: deanPassword },
  })
  const deanToken = dean.data.token

  let items = await getItems(adminToken)
  const names = new Set(items.map((item) => item.itemName))
  const itemPlans = [
    { itemName: 'Whiteboard Marker', category: 'Classroom Supplies', unit: 'piece', quantity: 75, reorderLevel: 30 },
    { itemName: 'Bond Paper Legal', category: 'Office Stationery', unit: 'ream', quantity: 4, reorderLevel: 8 },
    { itemName: 'Ink Cartridge Black', category: 'Office Stationery', unit: 'piece', quantity: 3, reorderLevel: 5 },
    { itemName: 'Folder Long', category: 'Office Stationery', unit: 'piece', quantity: 120, reorderLevel: 40 },
    { itemName: 'Manila Paper', category: 'Classroom Supplies', unit: 'pack', quantity: 22, reorderLevel: 12 },
    { itemName: 'Laboratory Goggles', category: 'Laboratory Supplies', unit: 'piece', quantity: 9, reorderLevel: 15 },
    { itemName: 'Disinfectant Spray', category: 'Cleaning Supplies', unit: 'bottle', quantity: 28, reorderLevel: 10 },
    { itemName: 'Paper Clips', category: 'Office Stationery', unit: 'box', quantity: 6, reorderLevel: 20 },
    { itemName: 'Correction Tape', category: 'Office Stationery', unit: 'piece', quantity: 48, reorderLevel: 20 },
    { itemName: 'Stamp Pad', category: 'Office Stationery', unit: 'piece', quantity: 8, reorderLevel: 10 },
  ]

  for (const plan of itemPlans) {
    if (names.has(plan.itemName)) continue
    await api('/inventory', { method: 'POST', token: adminToken, body: plan })
    names.add(plan.itemName)
  }
  items = await getItems(adminToken)
  const itemId = (name) => {
    const item = items.find((entry) => entry.itemName === name)
    if (!item) throw new Error(`Missing inventory item: ${name}`)
    return item._id
  }

  for (const plan of itemPlans) {
    await api('/transactions/stock-in', {
      method: 'POST',
      token: adminToken,
      body: {
        itemId: itemId(plan.itemName),
        quantity: plan.quantity + 12,
        note: `Opening delivery of ${plan.itemName} for the semester`,
      },
    })
  }

  const requestPlans = [
    {
      purpose: 'Quarterly classroom supplies for Grade 7',
      days: 5,
      lines: [['Notebook', 12], ['Whiteboard Marker', 8], ['Manila Paper', 4]],
    },
    {
      purpose: 'Office supplies for guidance counseling',
      days: 7,
      lines: [['Bond Paper Legal', 2], ['Folder Long', 10], ['Correction Tape', 6]],
    },
    {
      purpose: 'Science laboratory consumables for Grade 9',
      days: 3,
      lines: [['Laboratory Goggles', 5], ['Disinfectant Spray', 4]],
      workflow: 'fulfill',
    },
    {
      purpose: 'Faculty markers for department meetings',
      days: 10,
      lines: [['Whiteboard Marker', 15], ['Stamp Pad', 3]],
      workflow: 'reject',
    },
  ]

  let createdRequests = 0
  let completedWorkflows = 0
  for (const plan of requestPlans) {
    if (await hasRequest(deanToken, plan.purpose)) continue
    const request = await api('/requests', {
      method: 'POST',
      token: deanToken,
      body: {
        items: plan.lines.map(([name, quantity]) => ({ item: itemId(name), quantity })),
        purpose: plan.purpose,
        dateNeeded: new Date(Date.now() + plan.days * 86400000).toISOString(),
      },
    })
    createdRequests += 1
    if (plan.workflow === 'fulfill') {
      await api(`/requests/${request.data._id}/approve`, {
        method: 'PATCH',
        token: adminToken,
        body: { remarks: 'Approved for immediate release.' },
      })
      await api(`/requests/${request.data._id}/fulfill`, { method: 'PATCH', token: adminToken })
      completedWorkflows += 1
    }
    if (plan.workflow === 'reject') {
      await api(`/requests/${request.data._id}/reject`, {
        method: 'PATCH',
        token: adminToken,
        body: { remarks: 'Please resubmit with a smaller quantity and updated budget.' },
      })
      completedWorkflows += 1
    }
  }

  console.log(`Demo data ready: ${items.length} items, ${createdRequests} new requests, ${completedWorkflows} completed workflows.`)
}

main().catch((error) => {
  console.error(`Demo data failed: ${error.message}`)
  process.exit(1)
})
