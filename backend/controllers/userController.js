import { User } from '../models/User.js'
import { ROLE_LABELS } from '../utils/constants.js'
import { getPagination } from '../utils/pagination.js'
import { sendSuccess, sendPaginated } from '../utils/response.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError, badRequest, notFound } from '../utils/apiError.js'
import { writeAudit } from '../services/auditService.js'

function escapeRegex(value = '') {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query)
  const filter = {}
  if (req.query.search) {
    const pattern = new RegExp(escapeRegex(req.query.search), 'i')
    filter.$or = [{ fullName: pattern }, { username: pattern }, { department: pattern }]
  }
  if (req.query.role) filter.role = req.query.role
  const status = String(req.query.status || '').toLowerCase()
  if (status === 'active') filter.isActive = true
  if (status === 'inactive') filter.isActive = false

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ])
  sendPaginated(res, { items: items.map((item) => ({ ...item.toJSON(), roleLabel: ROLE_LABELS[item.role] })), total, page, limit })
})

export const createUser = asyncHandler(async (req, res) => {
  const { fullName, username, password, role, department } = req.body
  const user = await User.create({
    fullName,
    username: username.toLowerCase().trim(),
    passwordHash: await User.hashPassword(password),
    role,
    department,
    isActive: true,
  })
  await writeAudit({
    user: req.user,
    action: 'USER_ACCOUNT_CREATED',
    description: `Created account for ${user.fullName} (${user.username}) as ${ROLE_LABELS[user.role]}`,
    req,
  })
  sendSuccess(res, user.toJSON(), 'User account created', 201)
})

export const updateUser = asyncHandler(async (req, res) => {
  const { fullName, role, department } = req.body
  const user = await User.findById(req.params.id)
  if (!user) throw notFound('User not found')
  if (user._id.toString() === req.user.id && role && role !== user.role) {
    throw badRequest('You cannot change your own role')
  }

  const changes = []
  if (fullName !== undefined) { user.fullName = fullName; changes.push('full name') }
  if (role !== undefined) { user.role = role; changes.push('role') }
  if (department !== undefined) { user.department = department; changes.push('department') }
  await user.save()

  await writeAudit({
    user: req.user,
    action: 'USER_ACCOUNT_UPDATED',
    description: `Updated ${changes.join(', ') || 'details'} for ${user.fullName}`,
    req,
    metadata: { targetUserId: user._id.toString() },
  })
  sendSuccess(res, user.toJSON(), 'User updated')
})

export const setUserStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body
  if (req.params.id === req.user.id && isActive === false) {
    throw badRequest('You cannot deactivate your own account')
  }
  const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true, runValidators: true })
  if (!user) throw notFound('User not found')

  await writeAudit({
    user: req.user,
    action: isActive ? 'USER_ACCOUNT_UPDATED' : 'USER_ACCOUNT_DEACTIVATED',
    description: `${isActive ? 'Activated' : 'Deactivated'} account for ${user.fullName}`,
    req,
  })
  sendSuccess(res, user.toJSON(), isActive ? 'Account activated' : 'Account deactivated')
})

export const resetUserPassword = asyncHandler(async (req, res) => {
  const { newPassword } = req.body
  const user = await User.findById(req.params.id)
  if (!user) throw notFound('User not found')
  user.passwordHash = await User.hashPassword(newPassword)
  user.passwordChangedAt = new Date()
  await user.save()
  await writeAudit({
    user: req.user,
    action: 'USER_PASSWORD_RESET',
    description: `Reset password for ${user.fullName} (${user.username})`,
    req,
  })
  sendSuccess(res, null, 'Password reset successfully. Share the new password securely with the user.')
})

export const getDepartments = asyncHandler(async (_req, res) => {
  const departments = await User.distinct('department')
  sendSuccess(res, departments.sort())
})

export const assertSelfOrAdmin = (userId, requester) => {
  if (userId !== requester.id) throw new ApiError(403, 'You can only view your own account')
}
