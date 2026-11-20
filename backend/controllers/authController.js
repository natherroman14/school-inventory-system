import { User } from '../models/User.js'
import { generateAuthToken } from '../middleware/auth.js'
import { ApiError, unauthorized } from '../utils/apiError.js'
import { sendSuccess } from '../utils/response.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { writeAudit } from '../services/auditService.js'
import { config } from '../config/env.js'

export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body
  const user = await User.findOne({ username: String(username).toLowerCase().trim() }).select('+passwordHash')
  if (!user || !user.isActive || !(await user.verifyPassword(password))) {
    throw unauthorized('Invalid username or password')
  }

  user.lastLogin = new Date()
  await user.save({ validateBeforeSave: false })
  const token = generateAuthToken(user)

  await writeAudit({
    user,
    action: 'USER_LOGIN',
    description: `${user.fullName} signed in`,
    req,
  })

  sendSuccess(
    res,
    {
      token,
      expiresIn: config.jwtExpiresIn,
      user: {
        id: user._id.toString(),
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        department: user.department,
      },
    },
    'Welcome back',
  )
})

export const logout = asyncHandler(async (req, res) => {
  const { RevokedToken } = await import('../models/Counter.js')
  const expiresAt = new Date(req.token.exp * 1000)
  await RevokedToken.updateOne(
    { jti: req.token.jti },
    { $setOnInsert: { jti: req.token.jti, expiresAt } },
    { upsert: true },
  )
  await writeAudit({
    user: req.user,
    action: 'USER_LOGOUT',
    description: `${req.user.fullName} signed out`,
    req,
  })
  sendSuccess(res, null, 'You have been logged out')
})

export const me = asyncHandler(async (req, res) => {
  sendSuccess(res, req.user)
})

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body
  const user = await User.findById(req.user.id).select('+passwordHash')
  if (!user || !(await user.verifyPassword(currentPassword))) {
    throw new ApiError(400, 'Current password is incorrect')
  }
  user.passwordHash = await User.hashPassword(newPassword)
  user.passwordChangedAt = new Date()
  await user.save()
  await writeAudit({
    user,
    action: 'USER_PASSWORD_RESET',
    description: `${user.fullName} changed their password`,
    req,
  })
  sendSuccess(res, null, 'Password updated successfully')
})
