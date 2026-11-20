import { InventoryItem } from '../models/InventoryItem.js'
import { StockTransaction } from '../models/StockTransaction.js'
import { SupplyRequest } from '../models/SupplyRequest.js'
import { Notification } from '../models/Notification.js'
import { nextSequence } from './numberService.js'
import { syncStockAlert } from './notificationService.js'
import { conflict, notFound } from '../utils/apiError.js'

export async function recordStockMovement({ itemId, quantity, type, performedBy, relatedRequest = null, note = '', session = null }) {
  const amount = Number(quantity)
  if (!Number.isFinite(amount) || amount <= 0) throw conflict('Quantity must be greater than zero')

  const increment = type === 'STOCK_IN' ? amount : -amount
  const item = await InventoryItem.findOneAndUpdate(
    { _id: itemId, isArchived: false, ...(increment < 0 ? { quantity: { $gte: amount } } : {}) },
    { $inc: { quantity: increment } },
    { new: true, runValidators: true, session },
  )
  if (!item) throw conflict('Insufficient stock or item is no longer active')

  const previousQuantity = item.quantity - increment
  const transaction = (
    await StockTransaction.create(
      [{
        transactionId: await nextSequence('TX'),
        item: item._id,
        quantity: amount,
        transactionType: type,
        previousQuantity,
        newQuantity: item.quantity,
        performedBy,
        relatedRequest,
        note,
      }],
      { session },
    )
  )[0]

  await syncStockAlert(item, performedBy, session)
  return { item, transaction }
}

export async function fulfillSupplyRequest(requestId, performedBy) {
  const request = await SupplyRequest.findOneAndUpdate(
    { _id: requestId, status: 'APPROVED' },
    { $set: { status: 'FULFILLED', fulfilledBy: performedBy, fulfilledAt: new Date() } },
    { new: true },
  ).populate('requestedBy', 'fullName username department role')
  if (!request) throw conflict('Only an approved request can be fulfilled')

  const applied = []
  try {
    for (const line of request.items) {
      const result = await recordStockMovement({
        itemId: line.item,
        quantity: line.quantity,
        type: 'STOCK_OUT',
        performedBy,
        relatedRequest: request._id,
        note: `Issued for ${request.requestNumber}`,
      })
      applied.push({ itemId: line.item, quantity: line.quantity, transactionId: result.transaction._id })
    }
  } catch (error) {
    for (const entry of applied) {
      await InventoryItem.updateOne({ _id: entry.itemId }, { $inc: { quantity: entry.quantity } })
      await Notification.deleteOne({ relatedRequest: request._id, 'metadata.transactionId': entry.transactionId }).catch(() => {})
    }
    await StockTransaction.deleteMany({ _id: { $in: applied.map((entry) => entry.transactionId) } })
    await SupplyRequest.updateOne(
      { _id: requestId, status: 'FULFILLED' },
      { $set: { status: 'APPROVED', fulfilledBy: null, fulfilledAt: null } },
    )
    throw error
  }

  await Notification.deleteMany({ recipient: request.requestedBy._id, type: 'REQUEST_APPROVED', relatedRequest: request._id })
  return request
}

export async function getItemOrThrow(id) {
  const item = await InventoryItem.findOne({ _id: id, isArchived: false })
  if (!item) throw notFound('Inventory item not found')
  return item
}
