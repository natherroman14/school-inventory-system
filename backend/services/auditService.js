import { AuditLog } from '../models/AuditLog.js'

function resolveUser(user) {
  if (!user) return null
  return typeof user === 'object' ? user._id || user.id : user
}

export async function writeAudit({ user = null, action, description, req = null, metadata = {} }) {
  try {
    await AuditLog.create({
      user: resolveUser(user),
      action,
      description,
      metadata,
      ip: req?.ip || null,
    })
  } catch (error) {
    console.error('Failed to write audit log:', error.message)
  }
}
