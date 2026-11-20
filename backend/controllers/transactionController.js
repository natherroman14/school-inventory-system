import { StockTransaction } from '../models/StockTransaction.js'
import { InventoryItem } from '../models/InventoryItem.js'
import { SupplyRequest } from '../models/SupplyRequest.js'
import { User } from '../models/User.js'
import { dateRange, getPagination } from '../utils/pagination.js'
import { sendSuccess, sendPaginated } from '../utils/response.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { notFound } from '../utils/apiError.js'
import { AUDIT_ACTIONS } from '../utils/constants.js'
import { recordStockMovement } from '../services/stockService.js'
import { writeAudit } from '../services/auditService.js'

function escapeRegex(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function buildTransactionFilter(query) {
  const filter = {}
  const dates = dateRange(query)
  if (dates) filter.createdAt = dates
  if (query.transactionType) filter.transactionType = query.transactionType
  if (query.item) filter.item = query.item
  if (query.search) filter.transactionId = new RegExp(escapeRegex(query.search), 'i')
  return filter
}

export async function applyScopeFilters(filter, query) {
  if (query.category) {
    const items = await InventoryItem.find({ category: query.category, isArchived: { $in: [true, false] } }).select('_id')
    filter.item = { $in: items.map((item) => item._id) }
  }
  if (query.department) {
    const users = await User.find({ department: query.department }).select('_id')
    const requests = await SupplyRequest.find({ requestedBy: { $in: users.map((user) => user._id) } }).select('_id')
    filter.relatedRequest = { $in: requests.map((request) => request._id) }
  }
  return filter
}

export const listTransactions = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query)
  const filter = await applyScopeFilters(buildTransactionFilter(req.query), req.query)
  const [items, total] = await Promise.all([
    StockTransaction.find(filter)
      .populate('item', 'itemCode itemName unit category')
      .populate('performedBy', 'fullName username')
      .populate('relatedRequest', 'requestNumber status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    StockTransaction.countDocuments(filter),
  ])
  sendPaginated(res, { items, total, page, limit })
})

export const stockIn = asyncHandler(async (req, res) => {
  const { itemId, quantity, note } = req.body
  const { item, transaction } = await recordStockMovement({
    itemId,
    quantity,
    type: 'STOCK_IN',
    performedBy: req.user.id,
    note: note || 'Supplies received or replenished',
  })
  await writeAudit({
    user: req.user,
    action: AUDIT_ACTIONS.STOCK_IN,
    description: `Stocked in ${quantity} ${item.unit}(s) of ${item.itemName}; new quantity ${item.quantity}`,
    req,
    metadata: { transactionId: transaction.transactionId },
  })
  sendSuccess(res, { item, transaction }, 'Stock-in recorded', 201)
})
