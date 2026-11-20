import { Notification } from '../models/Notification.js'
import { isAdminRole } from '../utils/constants.js'
import { getPagination } from '../utils/pagination.js'
import { sendSuccess, sendPaginated } from '../utils/response.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { notFound } from '../utils/apiError.js'

const ALERT_TYPES = ['LOW_STOCK', 'OUT_OF_STOCK']

export const listNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query)
  const access = [{ recipient: req.user.id }]
  if (isAdminRole(req.user.role)) access.push({ recipient: null, type: { $in: ALERT_TYPES } })
  const filter = { $or: access }
  if (req.query.type) filter.type = req.query.type.split(',')
  if (req.query.isRead === 'true') filter.isRead = true
  if (req.query.isRead === 'false') filter.isRead = false
  if (req.query.scope === 'alerts') {
    filter.type = { $in: ALERT_TYPES }
    if (!isAdminRole(req.user.role)) filter.recipient = req.user.id
  }

  const [items, total] = await Promise.all([
    Notification.find(filter)
      .populate('relatedItem', 'itemCode itemName quantity reorderLevel unit')
      .populate('relatedRequest', 'requestNumber status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(filter),
  ])
  sendPaginated(res, { items, total, page, limit })
})

function visibleFilter(user) {
  const access = [{ recipient: user.id }]
  if (isAdminRole(user.role)) access.push({ recipient: null, type: { $in: ALERT_TYPES } })
  return { $or: access, isRead: false }
}

export const unreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments(visibleFilter(req.user))
  sendSuccess(res, { count })
})

export const markRead = asyncHandler(async (req, res) => {
  const access = [{ recipient: req.user.id }]
  if (isAdminRole(req.user.role)) access.push({ recipient: null, type: { $in: ALERT_TYPES } })
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, $or: access },
    { $set: { isRead: true } },
    { new: true },
  )
  if (!notification) throw notFound('Notification not found')
  sendSuccess(res, notification, 'Notification marked as read')
})

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(visibleFilter(req.user), { $set: { isRead: true } })
  sendSuccess(res, null, 'All notifications marked as read')
})
