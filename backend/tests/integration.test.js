import './setup.js'
import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { createApp } from '../app.js'
import { connectDB, disconnectDB } from '../config/db.js'
import { User } from '../models/User.js'
import { InventoryItem } from '../models/InventoryItem.js'
import { StockTransaction } from '../models/StockTransaction.js'
import { SupplyRequest } from '../models/SupplyRequest.js'
import { Notification } from '../models/Notification.js'
import { AuditLog } from '../models/AuditLog.js'

const app = createApp()
let mongod
let adminToken
let deanToken
let otherDeanToken
let itemId

async function login(username, password = 'Pass1234') {
  const response = await request(app).post('/api/auth/login').send({ username, password })
  assert.equal(response.status, 200, JSON.stringify(response.body))
  return response.body.data.token
}

before(async () => {
  mongod = await MongoMemoryServer.create()
  await connectDB(mongod.getUri())
  await User.create({
    fullName: 'Ana Custodian', username: 'custodian', passwordHash: await User.hashPassword('Pass1234'),
    role: 'CUSTODIAN', department: 'Supply Office',
  })
  await User.create({
    fullName: 'Danny Dean', username: 'dean', passwordHash: await User.hashPassword('Pass1234'),
    role: 'DEAN', department: 'College of Engineering',
  })
  await User.create({
    fullName: 'Lorry Head', username: 'programhead', passwordHash: await User.hashPassword('Pass1234'),
    role: 'PROGRAM_HEAD', department: 'College of Arts and Sciences',
  })
  adminToken = await login('custodian')
  deanToken = await login('dean')
  otherDeanToken = await login('programhead')
})

after(async () => {
  await disconnectDB()
  await mongod.stop()
})

describe('Authentication and RBAC', () => {
  it('rejects invalid credentials', async () => {
    const response = await request(app).post('/api/auth/login').send({ username: 'custodian', password: 'wrong' })
    assert.equal(response.status, 401)
    assert.equal(response.body.success, false)
  })

  it('requires a token for protected routes', async () => {
    const response = await request(app).get('/api/inventory')
    assert.equal(response.status, 401)
  })

  it('identifies the logged-in user', async () => {
    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${deanToken}`)
    assert.equal(response.status, 200)
    assert.equal(response.body.data.role, 'DEAN')
  })

  it('blocks deans from administrative endpoints', async () => {
    const response = await request(app).post('/api/inventory').set('Authorization', `Bearer ${deanToken}`).send({
      itemName: 'Not allowed', category: 'Classroom Supplies', unit: 'piece', quantity: 5, reorderLevel: 2,
    })
    assert.equal(response.status, 403)
  })

  it('blocks deans from reports and audit logs', async () => {
    assert.equal((await request(app).get('/api/reports/inventory').set('Authorization', `Bearer ${deanToken}`)).status, 403)
    assert.equal((await request(app).get('/api/audit-logs').set('Authorization', `Bearer ${deanToken}`)).status, 403)
  })

  it('ends the session on logout and revokes the token', async () => {
    const token = await login('custodian')
    const response = await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${token}`)
    assert.equal(response.status, 200)
    const afterLogout = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)
    assert.equal(afterLogout.status, 401)
  })
})

describe('Inventory management', () => {
  it('creates an item with an auto-generated code', async () => {
    const response = await request(app).post('/api/inventory').set('Authorization', `Bearer ${adminToken}`).send({
      itemCode: '', itemName: 'Bond Paper A4', category: 'Office Stationery', unit: 'ream',
      quantity: 20, reorderLevel: 10,
    })
    assert.equal(response.status, 201, JSON.stringify(response.body))
    assert.ok(response.body.data.itemCode.startsWith('ITM-'))
    itemId = response.body.data._id
    assert.equal(response.body.data.status, 'IN STOCK')
  })

  it('searches and filters items', async () => {
    const search = await request(app).get('/api/inventory?search=Bond').set('Authorization', `Bearer ${deanToken}`)
    assert.equal(search.body.data.length, 1)
    const low = await request(app).get('/api/inventory?status=LOW%20STOCK').set('Authorization', `Bearer ${adminToken}`)
    assert.equal(low.body.data.length, 0)
  })

  it('updates an item', async () => {
    const response = await request(app).put(`/api/inventory/${itemId}`).set('Authorization', `Bearer ${adminToken}`).send({
      itemCode: 'BOND-A4', itemName: 'Bond Paper A4', category: 'Office Stationery', unit: 'ream',
      quantity: 8, reorderLevel: 10,
    })
    assert.equal(response.status, 200)
    assert.equal(response.body.data.status, 'LOW STOCK')
  })

  it('creates a low-stock alert for items at or below reorder level', async () => {
    const alerts = await request(app).get('/api/notifications?scope=alerts').set('Authorization', `Bearer ${adminToken}`)
    assert.equal(alerts.body.data.length, 1)
    assert.equal(alerts.body.data[0].type, 'LOW_STOCK')
    assert.equal(alerts.body.data[0].status, 'ACTIVE')
  })

  it('archives items instead of deleting historical records', async () => {
    const create = await request(app).post('/api/inventory').set('Authorization', `Bearer ${adminToken}`).send({
      itemName: 'Temporary Marker', category: 'Classroom Supplies', unit: 'piece', quantity: 2, reorderLevel: 1,
    })
    const response = await request(app).delete(`/api/inventory/${create.body.data._id}`).set('Authorization', `Bearer ${adminToken}`)
    assert.equal(response.status, 200)
    const stillInDb = await InventoryItem.findById(create.body.data._id)
    assert.equal(stillInDb.isArchived, true)
  })
})

describe('Supply requisition workflow', () => {
  let requestId

  it('lets a dean submit a request and notifies custodians', async () => {
    const response = await request(app).post('/api/requests').set('Authorization', `Bearer ${deanToken}`).send({
      items: [{ item: itemId, quantity: 3 }],
      purpose: 'For engineering laboratory classes',
      dateNeeded: new Date().toISOString(),
    })
    assert.equal(response.status, 201, JSON.stringify(response.body))
    assert.equal(response.body.data.status, 'PENDING')
    requestId = response.body.data._id
    const notifications = await request(app).get('/api/notifications').set('Authorization', `Bearer ${adminToken}`)
    assert.ok(notifications.body.data.some((note) => note.type === 'REQUEST_SUBMITTED'))
  })

  it('validates requested quantities against available stock', async () => {
    const response = await request(app).post('/api/requests').set('Authorization', `Bearer ${deanToken}`).send({
      items: [{ item: itemId, quantity: 999 }],
      purpose: 'Too many',
      dateNeeded: new Date().toISOString(),
    })
    assert.equal(response.status, 400)
  })

  it('prevents deans from seeing another department’s requests', async () => {
    const response = await request(app).get(`/api/requests/${requestId}`).set('Authorization', `Bearer ${otherDeanToken}`)
    assert.equal(response.status, 403)
  })

  it('requires remarks for rejection', async () => {
    const response = await request(app).patch(`/api/requests/${requestId}/reject`).set('Authorization', `Bearer ${adminToken}`).send({ remarks: '   ' })
    assert.equal(response.status, 400)
  })

  it('approves the pending request', async () => {
    const response = await request(app).patch(`/api/requests/${requestId}/approve`).set('Authorization', `Bearer ${adminToken}`).send({})
    assert.equal(response.status, 200)
    assert.equal(response.body.data.status, 'APPROVED')
  })

  it('fulfills the request, deducts stock once, and records a transaction', async () => {
    const before = await InventoryItem.findById(itemId)
    const response = await request(app).patch(`/api/requests/${requestId}/fulfill`).set('Authorization', `Bearer ${adminToken}`).send({})
    assert.equal(response.status, 200, JSON.stringify(response.body))
    const after = await InventoryItem.findById(itemId)
    assert.equal(after.quantity, before.quantity - 3)
    assert.ok(after.quantity >= 0)
    const transactions = await request(app).get('/api/transactions?transactionType=STOCK_OUT').set('Authorization', `Bearer ${adminToken}`)
    assert.equal(transactions.body.pagination.total, 1)
    assert.equal(transactions.body.data[0].quantity, 3)
    assert.equal(String(transactions.body.data[0].relatedRequest._id), requestId)
    const deanNotes = await request(app).get('/api/notifications').set('Authorization', `Bearer ${deanToken}`)
    assert.ok(deanNotes.body.data.some((note) => note.type === 'REQUEST_FULFILLED'))
  })

  it('never deducts inventory twice', async () => {
    const before = await InventoryItem.findById(itemId)
    const response = await request(app).patch(`/api/requests/${requestId}/fulfill`).set('Authorization', `Bearer ${adminToken}`).send({})
    assert.equal(response.status, 409)
    const after = await InventoryItem.findById(itemId)
    assert.equal(after.quantity, before.quantity)
    assert.equal(await StockTransaction.countDocuments({ relatedRequest: requestId }), 1)
  })

  it('generates an out-of-stock alert when quantity reaches zero', async () => {
    const update = await request(app).put(`/api/inventory/${itemId}`).set('Authorization', `Bearer ${adminToken}`).send({
      itemCode: 'BOND-A4', itemName: 'Bond Paper A4', category: 'Office Stationery', unit: 'ream',
      quantity: 0, reorderLevel: 10,
    })
    assert.equal(update.status, 200)
    const alerts = await request(app).get('/api/notifications?scope=alerts').set('Authorization', `Bearer ${adminToken}`)
    assert.ok(alerts.body.data.some((note) => note.type === 'OUT_OF_STOCK' && note.status === 'ACTIVE'))
  })

  it('records stock-in and switches the alert back to low stock', async () => {
    const response = await request(app).post('/api/transactions/stock-in').set('Authorization', `Bearer ${adminToken}`).send({
      itemId, quantity: 5, note: 'Replenishment',
    })
    assert.equal(response.status, 201)
    const replenished = await InventoryItem.findById(itemId)
    assert.equal(replenished.quantity, 5)
    const alerts = await request(app).get('/api/notifications?scope=alerts').set('Authorization', `Bearer ${adminToken}`)
    assert.ok(alerts.body.data.some((note) => note.type === 'LOW_STOCK' && note.status === 'ACTIVE'))
    assert.equal(await Notification.countDocuments({ type: 'OUT_OF_STOCK', status: 'ACTIVE' }), 0)
  })
})

describe('Reports, dashboard, and audit trail', () => {
  it('returns dashboard statistics from the database', async () => {
    const response = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${adminToken}`)
    assert.equal(response.status, 200)
    assert.equal(response.body.data.stats.pendingRequests, 0)
    assert.equal(response.body.data.consumptionChart.length, 6)
  })

  it('returns report rows from database records', async () => {
    const paths = ['inventory', 'transactions', 'consumption', 'requests']
    for (const path of paths) {
      const response = await request(app).get(`/api/reports/${path}`).set('Authorization', `Bearer ${adminToken}`)
      assert.equal(response.status, 200, path)
      assert.ok(Array.isArray(response.body.data.rows), path)
    }
  })

  it('records significant actions in immutable audit logs', async () => {
    const response = await request(app).get('/api/audit-logs').set('Authorization', `Bearer ${adminToken}`)
    assert.equal(response.status, 200)
    const actions = response.body.data.map((log) => log.action)
    for (const action of ['USER_LOGIN', 'INVENTORY_ITEM_CREATED', 'SUPPLY_REQUEST_SUBMITTED', 'SUPPLY_REQUEST_FULFILLED', 'STOCK_IN']) {
      assert.ok(actions.includes(action), action)
    }
    await assert.rejects(() => AuditLog.updateOne({}, { $set: { action: 'TAMPERED' } }), /immutable/i)
  })

  it('keeps only one active low-stock alert per item', async () => {
    assert.equal(await Notification.countDocuments({ type: 'LOW_STOCK', status: 'ACTIVE', relatedItem: itemId }), 1)
  })
})
