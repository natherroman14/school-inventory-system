import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import { User } from '../models/User.js'
import { RevokedToken } from '../models/Counter.js'
import { config } from '../config/env.js'
import { unauthorized, forbidden } from '../utils/apiError.js'
import { ADMIN_ROLES, REQUESTER_ROLES } from '../utils/constants.js'

export function generateAuthToken(user) {
  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role, jti: randomUUID() },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  )
  return token
}

export async function protect(req, _res, next) {
  try {
    const header = req.headers.authorization || ''
    const [scheme, token] = header.split(' ')
    if (scheme !== 'Bearer' || !token) throw unauthorized('Please log in to continue')

    let decoded
    try {
      decoded = jwt.verify(token, config.jwtSecret)
    } catch {
      throw unauthorized('Your session has expired. Please log in again')
    }

    const revoked = await RevokedToken.exists({ jti: decoded.jti })
    if (revoked) throw unauthorized('This session has been ended. Please log in again')

    const user = await User.findById(decoded.sub)
    if (!user || !user.isActive) throw unauthorized('Your account is no longer active')

    req.user = {
      id: user._id.toString(),
      role: user.role,
      fullName: user.fullName,
      username: user.username,
      department: user.department,
    }
    req.token = { ...decoded, token }
    next()
  } catch (error) {
    next(error)
  }
}

export function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized())
    if (!roles.includes(req.user.role)) return next(forbidden())
    next()
  }
}

export const requireAdmin = authorize(...ADMIN_ROLES)
export const requireRequester = authorize(...REQUESTER_ROLES)
