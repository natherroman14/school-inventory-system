import { InventoryItem } from '../models/InventoryItem.js'
import { SupplyRequest } from '../models/SupplyRequest.js'
import { StockTransaction } from '../models/StockTransaction.js'
import { User } from '../models/User.js'
import { buildTransactionFilter, applyScopeFilters } from './transactionController.js'
import { dateRange } from '../utils/pagination.js'
import { sendSuccess } from '../utils/response.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { stockStatus } from '../utils/constants.js'

function escapeRegex(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const inventoryReport = asyncHandler(async (req, res) => {
  const filter = { isArchived: false }
  const dates = dateRange(req.query)
  if (dates) filter.createdAt = dates
  if (req.query.category) filter.category = req.query.category
  if (req.query.item) filter._id = req.query.item
  if (req.query.search) filter.itemName = new RegExp(escapeRegex(req.query.search), 'i')

  const items = await InventoryItem.find(filter).sort({ itemName: 1 })
  const rows = items.map((item) => ({
    itemCode: item.itemCode,
    itemName: item.itemName,
    category: item.category,
    unit: item.unit,
    quantity: item.quantity,
    reorderLevel: item.reorderLevel,
    status: stockStatus(item.quantity, item.reorderLevel),
    dateAdded: item.createdAt,
  }))
  const summary = {
    totalItems: rows.length,
    inStock: rows.filter((row) => row.status === 'IN STOCK').length,
    lowStock: rows.filter((row) => row.status === 'LOW STOCK').length,
    outOfStock: rows.filter((row) => row.status === 'OUT OF STOCK').length,
    totalUnits: rows.reduce((sum, row) => sum + row.quantity, 0),
  }
  sendSuccess(res, { rows, summary, columns: reportColumns.inventory })
})

export const transactionsReport = asyncHandler(async (req, res) => {
  const filter = await applyScopeFilters(buildTransactionFilter(req.query), req.query)
  const transactions = await StockTransaction.find(filter)
    .populate('item', 'itemCode itemName unit category')
    .populate('performedBy', 'fullName')
    .populate('relatedRequest', 'requestNumber')
    .sort({ createdAt: -1 })

  const rows = transactions.map((tx) => ({
    transactionId: tx.transactionId,
    date: tx.createdAt,
    type: tx.transactionType,
    itemCode: tx.item?.itemCode || '',
    itemName: tx.item?.itemName || 'Archived item',
    category: tx.item?.category || '',
    quantity: tx.quantity,
    previousQuantity: tx.previousQuantity,
    newQuantity: tx.newQuantity,
    performedBy: tx.performedBy?.fullName || 'System',
    relatedRequest: tx.relatedRequest?.requestNumber || '',
  }))
  const summary = {
    totalTransactions: rows.length,
    stockIn: rows.filter((row) => row.type === 'STOCK_IN').reduce((sum, row) => sum + row.quantity, 0),
    stockOut: rows.filter((row) => row.type === 'STOCK_OUT').reduce((sum, row) => sum + row.quantity, 0),
  }
  sendSuccess(res, { rows, summary, columns: reportColumns.transactions })
})

export const consumptionReport = asyncHandler(async (req, res) => {
  const filter = { status: 'FULFILLED' }
  const dates = dateRange(req.query)
  if (dates) filter.fulfilledAt = dates
  if (req.query.department) filter.department = req.query.department
  if (req.query.item) filter['items.item'] = req.query.item

  const requests = await SupplyRequest.find(filter)
    .populate('requestedBy', 'fullName')
    .sort({ fulfilledAt: -1 })
  let rows = []
  for (const request of requests) {
    for (const line of request.items) {
      if (req.query.item && line.item.toString() !== req.query.item) continue
      rows.push({
        itemId: String(line.item),
        requestNumber: request.requestNumber,
        date: request.fulfilledAt || request.createdAt,
        department: request.department,
        itemCode: line.itemCode,
        itemName: line.itemName,
        unit: line.unit,
        quantity: line.quantity,
        requestedBy: request.requestedBy?.fullName || '',
      })
    }
  }
  if (req.query.category) {
    const items = await InventoryItem.find({ category: req.query.category }).select('_id')
    const ids = new Set(items.map((item) => item._id.toString()))
    rows = rows.filter((row) => ids.has(row.itemId))
  }
  const byDepartment = Object.entries(
    rows.reduce((acc, row) => {
      acc[row.department] = (acc[row.department] || 0) + row.quantity
      return acc
    }, {}),
  ).map(([department, quantity]) => ({ department, quantity }))

  const byItem = Object.entries(
    rows.reduce((acc, row) => {
      acc[row.itemName] = (acc[row.itemName] || 0) + row.quantity
      return acc
    }, {}),
  ).map(([item, quantity]) => ({ item, quantity }))

  sendSuccess(res, {
    rows,
    summary: { totalIssued: rows.reduce((sum, row) => sum + row.quantity, 0), requestCount: requests.length },
    byDepartment,
    byItem,
    columns: reportColumns.consumption,
  })
})

export const requestsReport = asyncHandler(async (req, res) => {
  const filter = {}
  const dates = dateRange(req.query)
  if (dates) filter.createdAt = dates
  if (req.query.status) filter.status = req.query.status
  if (req.query.department) filter.department = req.query.department
  if (req.query.item) filter['items.item'] = req.query.item
  if (req.query.search) filter.requestNumber = new RegExp(escapeRegex(req.query.search), 'i')

  const requests = await SupplyRequest.find(filter)
    .populate('requestedBy', 'fullName')
    .populate('approvedBy', 'fullName')
    .populate('fulfilledBy', 'fullName')
    .sort({ createdAt: -1 })

  const rows = requests.map((request) => ({
    requestNumber: request.requestNumber,
    dateRequested: request.createdAt,
    dateNeeded: request.dateNeeded,
    requestedBy: request.requestedBy?.fullName || '',
    department: request.department,
    items: request.items.map((item) => `${item.itemName} x${item.quantity} ${item.unit}`).join('; '),
    purpose: request.purpose,
    status: request.status,
    remarks: request.remarks || '',
  }))
  sendSuccess(res, {
    rows,
    summary: {
      total: rows.length,
      pending: rows.filter((row) => row.status === 'PENDING').length,
      approved: rows.filter((row) => row.status === 'APPROVED').length,
      rejected: rows.filter((row) => row.status === 'REJECTED').length,
      fulfilled: rows.filter((row) => row.status === 'FULFILLED').length,
    },
    columns: reportColumns.requests,
  })
})

export const reportMetadata = asyncHandler(async (_req, res) => {
  const [categories, departments, items] = await Promise.all([
    InventoryItem.distinct('category'),
    User.distinct('department'),
    InventoryItem.find({ isArchived: false }).select('itemCode itemName').sort({ itemName: 1 }),
  ])
  sendSuccess(res, { categories, departments, items })
})

const reportColumns = {
  inventory: [
    { key: 'itemCode', label: 'Item Code' },
    { key: 'itemName', label: 'Item Name' },
    { key: 'category', label: 'Category' },
    { key: 'unit', label: 'Unit' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'reorderLevel', label: 'Reorder Level' },
    { key: 'status', label: 'Status' },
    { key: 'dateAdded', label: 'Date Added' },
  ],
  transactions: [
    { key: 'transactionId', label: 'Transaction ID' },
    { key: 'date', label: 'Date' },
    { key: 'type', label: 'Type' },
    { key: 'itemName', label: 'Item' },
    { key: 'category', label: 'Category' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'previousQuantity', label: 'Previous Qty' },
    { key: 'newQuantity', label: 'New Qty' },
    { key: 'performedBy', label: 'Responsible User' },
    { key: 'relatedRequest', label: 'Request No.' },
  ],
  consumption: [
    { key: 'requestNumber', label: 'Request No.' },
    { key: 'date', label: 'Date Issued' },
    { key: 'department', label: 'Department' },
    { key: 'itemName', label: 'Item' },
    { key: 'quantity', label: 'Quantity' },
    { key: 'requestedBy', label: 'Requested By' },
  ],
  requests: [
    { key: 'requestNumber', label: 'Request No.' },
    { key: 'dateRequested', label: 'Date Requested' },
    { key: 'requestedBy', label: 'Requested By' },
    { key: 'department', label: 'Department' },
    { key: 'items', label: 'Items' },
    { key: 'purpose', label: 'Purpose' },
    { key: 'status', label: 'Status' },
  ],
}
