import mongoose from 'mongoose'
import { InventoryItem } from '../models/InventoryItem.js'
import { StockTransaction } from '../models/StockTransaction.js'
import { SupplyRequest } from '../models/SupplyRequest.js'
import { getPagination } from '../utils/pagination.js'
import { sendSuccess, sendPaginated } from '../utils/response.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { badRequest, notFound } from '../utils/apiError.js'
import { AUDIT_ACTIONS, stockStatus } from '../utils/constants.js'
import { writeAudit } from '../services/auditService.js'
import { nextSequence } from '../services/numberService.js'
import { syncStockAlert } from '../services/notificationService.js'

function escapeRegex(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function buildInventoryFilter(query) {
  const filter = { isArchived: query.includeArchived === 'true' ? { $in: [true, false] } : false }
  if (query.search) {
    const pattern = new RegExp(escapeRegex(query.search), 'i')
    filter.$or = [{ itemName: pattern }, { itemCode: pattern }]
  }
  if (query.category) filter.category = query.category
  if (query.status === 'IN STOCK') filter.$expr = { $gt: ['$quantity', '$reorderLevel'] }
  if (query.status === 'LOW STOCK') filter.$expr = { $and: [{ $gt: ['$quantity', 0] }, { $lte: ['$quantity', '$reorderLevel'] }] }
  if (query.status === 'OUT OF STOCK') filter.quantity = 0
  return filter
}

export const listInventory = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query)
  const filter = buildInventoryFilter(req.query)
  const [items, total] = await Promise.all([
    InventoryItem.find(filter).sort({ itemName: 1 }).skip(skip).limit(limit),
    InventoryItem.countDocuments(filter),
  ])
  sendPaginated(res, { items, total, page, limit })
})

export const getInventoryItem = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findById(req.params.id)
  if (!item) throw notFound('Inventory item not found')
  sendSuccess(res, item)
})

export const createInventoryItem = asyncHandler(async (req, res) => {
  const { itemCode, itemName, category, unit, quantity, reorderLevel } = req.body
  const code = String(itemCode || '').trim().toUpperCase() || (await nextSequence('ITM'))
  const item = await InventoryItem.create({
    itemCode: code,
    itemName,
    category,
    unit,
    quantity,
    reorderLevel,
  })
  await syncStockAlert(item, req.user.id)
  await writeAudit({
    user: req.user,
    action: AUDIT_ACTIONS.ITEM_CREATED,
    description: `Added ${item.itemName} (${item.itemCode}) with ${item.quantity} ${item.unit}(s)`,
    req,
  })
  sendSuccess(res, item, 'Inventory item added', 201)
})

export const updateInventoryItem = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findOne({ _id: req.params.id, isArchived: false })
  if (!item) throw notFound('Inventory item not found')
  const { itemCode, itemName, category, unit, quantity, reorderLevel } = req.body
  Object.assign(item, { itemCode, itemName, category, unit, quantity, reorderLevel })
  await item.save()
  await syncStockAlert(item, req.user.id)
  await writeAudit({
    user: req.user,
    action: AUDIT_ACTIONS.ITEM_UPDATED,
    description: `Updated ${item.itemName} (${item.itemCode}); quantity ${item.quantity}, reorder level ${item.reorderLevel}`,
    req,
  })
  sendSuccess(res, item, 'Inventory item updated')
})

export const archiveInventoryItem = asyncHandler(async (req, res) => {
  const item = await InventoryItem.findOne({ _id: req.params.id, isArchived: false })
  if (!item) throw notFound('Inventory item not found')

  const [transactions, requests] = await Promise.all([
    StockTransaction.countDocuments({ item: item._id }),
    SupplyRequest.countDocuments({ 'items.item': item._id }),
  ])

  item.isArchived = true
  item.archivedAt = new Date()
  item.archivedReason = 'Archived by custodian; historical records preserved'
  await item.save()

  await writeAudit({
    user: req.user,
    action: AUDIT_ACTIONS.ITEM_ARCHIVED,
    description: `Archived ${item.itemName} (${item.itemCode})`,
    req,
    metadata: { relatedTransactions: transactions, relatedRequests: requests, preserved: true },
  })
  sendSuccess(res, item, `Item archived. ${transactions} transaction(s) and ${requests} request(s) were preserved.`)
})

export const getInventoryOptions = asyncHandler(async (_req, res) => {
  const items = await InventoryItem.find({ isArchived: false })
    .select('itemCode itemName category unit quantity reorderLevel')
    .sort({ itemName: 1 })
  sendSuccess(res, items.map((item) => ({
    ...item.toObject(),
    status: stockStatus(item.quantity, item.reorderLevel),
  })))
})

export const checkItemCode = asyncHandler(async (req, res) => {
  const code = String(req.query.code || '').trim().toUpperCase()
  if (!code) throw badRequest('Code is required')
  const exists = await InventoryItem.exists({
    itemCode: code,
    ...(mongoose.Types.ObjectId.isValid(req.query.excludeId || '') ? { _id: { $ne: req.query.excludeId } } : {}),
  })
  sendSuccess(res, { available: !exists })
})
