export function getPagination(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 25))
  return { page, limit, skip: (page - 1) * limit }
}

export function parseDate(value, fieldName) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} must be a valid date`)
    error.statusCode = 400
    throw error
  }
  return date
}

export function dateRange(query = {}) {
  const start = parseDate(query.startDate, 'startDate')
  const end = parseDate(query.endDate, 'endDate')
  const range = {}
  if (start) range.$gte = start
  if (end) {
    const endOfDay = new Date(end)
    endOfDay.setHours(23, 59, 59, 999)
    range.$lte = endOfDay
  }
  return Object.keys(range).length ? range : undefined
}

export function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  return { $gte: start, $lt: end }
}
