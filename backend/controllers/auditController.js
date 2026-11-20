import { AuditLog } from '../models/AuditLog.js'
import { dateRange, getPagination } from '../utils/pagination.js'
import { sendPaginated } from '../utils/response.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const listAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query)
  const filter = {}
  if (req.query.action) filter.action = req.query.action
  if (req.query.user) filter.user = req.query.user
  if (req.query.search) filter.description = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  const dates = dateRange(req.query)
  if (dates) filter.timestamp = dates

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('user', 'fullName username role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit),
    AuditLog.countDocuments(filter),
  ])
  sendPaginated(res, { items, total, page, limit })
})
