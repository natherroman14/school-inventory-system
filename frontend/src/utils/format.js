export function formatDate(value, withTime = false) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  })
}

export function formatDateTime(value) {
  return formatDate(value, true)
}

export function formatNumber(value) {
  return new Intl.NumberFormat('en-PH').format(Number(value || 0))
}

export function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join('')
}

export function statusTone(status = '') {
  const key = String(status).toUpperCase()
  if (['IN STOCK', 'APPROVED', 'FULFILLED', 'ACTIVE', 'STOCK_IN'].includes(key)) return 'badge-green'
  if (['LOW STOCK', 'PENDING'].includes(key)) return 'badge-amber'
  if (['OUT OF STOCK', 'REJECTED', 'INACTIVE'].includes(key)) return 'badge-red'
  if (['STOCK_OUT'].includes(key)) return 'badge-blue'
  return 'badge-gray'
}

export function humanize(value = '') {
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}
