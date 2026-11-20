import { Notification } from '../models/Notification.js'
import { User } from '../models/User.js'
import { ADMIN_ROLES } from '../utils/constants.js'

export async function notifyUsers(userIds, payload) {
  const recipients = [...new Set(userIds.filter(Boolean).map(String))]
  if (!recipients.length) return []
  return Notification.create(
    recipients.map((recipient) => ({ recipient, status: 'NONE', ...payload })),
  )
}

export async function notifyAdmins(payload) {
  const admins = await User.find({ role: { $in: ADMIN_ROLES }, isActive: true }).select('_id')
  return notifyUsers(admins.map((user) => user._id), payload)
}

export async function syncStockAlert(item, actorId = null, session = null) {
  const isOut = Number(item.quantity) <= 0
  const isLow = Number(item.quantity) > 0 && Number(item.quantity) <= Number(item.reorderLevel)
  const query = {
    type: { $in: ['LOW_STOCK', 'OUT_OF_STOCK'] },
    relatedItem: item._id,
  }
  const existing = await Notification.findOne(query).session(session).sort({ createdAt: -1 })

  if (!isOut && !isLow) {
    if (existing && existing.status === 'ACTIVE') {
      existing.status = 'RESOLVED'
      await existing.save({ session })
    }
    return null
  }

  const type = isOut ? 'OUT_OF_STOCK' : 'LOW_STOCK'
  if (existing && existing.status === 'ACTIVE' && existing.type === type) return existing

  const payload = {
    title: isOut ? `Out of stock: ${item.itemName}` : `Low stock: ${item.itemName}`,
    message: isOut
      ? `${item.itemName} (${item.itemCode}) has reached zero. Replenish immediately.`
      : `${item.itemName} (${item.itemCode}) has ${item.quantity} ${item.unit}(s) left; reorder level is ${item.reorderLevel}.`,
    type,
    status: 'ACTIVE',
    isRead: false,
    relatedItem: item._id,
    recipient: null,
  }

  if (existing) {
    Object.assign(existing, payload)
    await existing.save({ session })
    return existing
  }

  return (await Notification.create([payload], { session }))[0]
}

export async function resolveStockAlerts(itemIds) {
  await Notification.updateMany(
    { relatedItem: { $in: itemIds }, type: { $in: ['LOW_STOCK', 'OUT_OF_STOCK'] }, status: 'ACTIVE' },
    { $set: { status: 'RESOLVED' } },
  )
}
