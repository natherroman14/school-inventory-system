import { SupplyRequest } from '../models/SupplyRequest.js'
import { InventoryItem } from '../models/InventoryItem.js'
import { User } from '../models/User.js'
import { getPagination, dateRange } from '../utils/pagination.js'
import { sendSuccess, sendPaginated } from '../utils/response.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { badRequest, conflict, forbidden, notFound } from '../utils/apiError.js'
import { AUDIT_ACTIONS, isAdminRole } from '../utils/constants.js'
import { nextSequence } from '../services/numberService.js'
import { notifyAdmins, notifyUsers } from '../services/notificationService.js'
import { fulfillSupplyRequest } from '../services/stockService.js'
import { writeAudit } from '../services/auditService.js'

const populateDetails = [
  { path: 'requestedBy', select: 'fullName username department role' },
  { path: 'approvedBy', select: 'fullName username' },
  { path: 'fulfilledBy', select: 'fullName username' },
  { path: 'items.item', select: 'itemCode itemName category unit quantity reorderLevel' },
]

function escapeRegex(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const listRequests = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query)
  const filter = {}
  if (!isAdminRole(req.user.role)) filter.requestedBy = req.user.id
  if (req.query.status) filter.status = req.query.status
  if (req.query.department && isAdminRole(req.user.role)) filter.department = req.query.department
  if (req.query.search) {
    const pattern = new RegExp(escapeRegex(req.query.search), 'i')
    const users = await User.find({ fullName: pattern }).select('_id')
    filter.$or = [{ requestNumber: pattern }, { purpose: pattern }, { requestedBy: { $in: users.map((user) => user._id) } }]
  }
  const dates = dateRange(req.query)
  if (dates) filter.createdAt = dates

  const [items, total] = await Promise.all([
    SupplyRequest.find(filter).populate(populateDetails).sort({ createdAt: -1 }).skip(skip).limit(limit),
    SupplyRequest.countDocuments(filter),
  ])
  sendPaginated(res, { items, total, page, limit })
})

export const getRequest = asyncHandler(async (req, res) => {
  const request = await SupplyRequest.findById(req.params.id).populate(populateDetails)
  if (!request) throw notFound('Supply request not found')
  if (!isAdminRole(req.user.role) && request.requestedBy._id.toString() !== req.user.id) {
    throw forbidden('You can only view your own requests')
  }
  sendSuccess(res, request)
})

export const createRequest = asyncHandler(async (req, res) => {
  const { items, purpose, dateNeeded } = req.body
  if (!Array.isArray(items) || items.length === 0) throw badRequest('Select at least one item')

  const quantities = new Map()
  for (const line of items) {
    const id = String(line.item)
    const quantity = Number(line.quantity)
    if (!Number.isInteger(quantity) || quantity <= 0) throw badRequest('Quantities must be positive whole numbers')
    quantities.set(id, (quantities.get(id) || 0) + quantity)
  }

  const inventoryItems = await InventoryItem.find({
    _id: { $in: [...quantities.keys()] },
    isArchived: false,
  })
  if (inventoryItems.length !== quantities.size) throw badRequest('One or more selected items are unavailable')

  const requestItems = inventoryItems.map((item) => {
    const quantity = quantities.get(item._id.toString())
    if (quantity > item.quantity) {
      throw badRequest(`Only ${item.quantity} ${item.unit}(s) of ${item.itemName} are available`)
    }
    return {
      item: item._id,
      itemCode: item.itemCode,
      itemName: item.itemName,
      unit: item.unit,
      quantity,
      availableAtRequest: item.quantity,
    }
  })

  const request = await SupplyRequest.create({
    requestNumber: await nextSequence('REQ'),
    requestedBy: req.user.id,
    department: req.user.department,
    items: requestItems,
    purpose,
    dateNeeded,
    status: 'PENDING',
  })

  await notifyAdmins({
    title: `New supply request ${request.requestNumber}`,
    message: `${req.user.fullName} from ${request.department} submitted a supply request.`,
    type: 'REQUEST_SUBMITTED',
    relatedRequest: request._id,
  })
  await writeAudit({
    user: req.user,
    action: AUDIT_ACTIONS.REQUEST_SUBMITTED,
    description: `Submitted supply request ${request.requestNumber} with ${requestItems.length} item(s)`,
    req,
  })

  await request.populate(populateDetails)
  sendSuccess(res, request, 'Supply request submitted', 201)
})

export const approveRequest = asyncHandler(async (req, res) => {
  const request = await SupplyRequest.findById(req.params.id).populate('requestedBy', 'fullName username department')
  if (!request) throw notFound('Supply request not found')
  const updated = await SupplyRequest.findOneAndUpdate(
    { _id: request._id, status: 'PENDING' },
    { $set: { status: 'APPROVED', approvedBy: req.user.id, approvedAt: new Date(), remarks: req.body.remarks || '' } },
    { new: true },
  ).populate(populateDetails)
  if (!updated) throw conflict('Only pending requests can be approved')

  await notifyUsers([request.requestedBy._id], {
    title: `Request ${request.requestNumber} approved`,
    message: `Your supply request ${request.requestNumber} was approved and is ready for fulfillment.`,
    type: 'REQUEST_APPROVED',
    relatedRequest: request._id,
  })
  await writeAudit({
    user: req.user,
    action: AUDIT_ACTIONS.REQUEST_APPROVED,
    description: `Approved supply request ${request.requestNumber}`,
    req,
  })
  sendSuccess(res, updated, 'Request approved')
})

export const rejectRequest = asyncHandler(async (req, res) => {
  const remarks = String(req.body.remarks || '').trim()
  if (!remarks) throw badRequest('Remarks are required when rejecting a request')
  const request = await SupplyRequest.findById(req.params.id).populate('requestedBy', 'fullName username department')
  if (!request) throw notFound('Supply request not found')
  const updated = await SupplyRequest.findOneAndUpdate(
    { _id: request._id, status: 'PENDING' },
    { $set: { status: 'REJECTED', approvedBy: req.user.id, approvedAt: new Date(), remarks } },
    { new: true },
  ).populate(populateDetails)
  if (!updated) throw conflict('Only pending requests can be rejected')

  await notifyUsers([request.requestedBy._id], {
    title: `Request ${request.requestNumber} rejected`,
    message: `Your supply request was rejected. Remarks: ${remarks}`,
    type: 'REQUEST_REJECTED',
    relatedRequest: request._id,
  })
  await writeAudit({
    user: req.user,
    action: AUDIT_ACTIONS.REQUEST_REJECTED,
    description: `Rejected supply request ${request.requestNumber}: ${remarks}`,
    req,
  })
  sendSuccess(res, updated, 'Request rejected')
})

export const fulfillRequest = asyncHandler(async (req, res) => {
  const existing = await SupplyRequest.findById(req.params.id).populate('requestedBy', 'fullName username department')
  if (!existing) throw notFound('Supply request not found')

  const updated = await fulfillSupplyRequest(existing._id, req.user.id)
  await notifyUsers([existing.requestedBy._id], {
    title: `Request ${updated.requestNumber} fulfilled`,
    message: `The supplies for ${updated.requestNumber} have been issued and your request is complete.`,
    type: 'REQUEST_FULFILLED',
    relatedRequest: updated._id,
  })
  await writeAudit({
    user: req.user,
    action: AUDIT_ACTIONS.REQUEST_FULFILLED,
    description: `Fulfilled supply request ${updated.requestNumber}; stock was deducted automatically`,
    req,
  })
  await updated.populate(populateDetails)
  sendSuccess(res, updated, 'Request fulfilled; inventory updated')
})
