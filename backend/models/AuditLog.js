import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    action: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: null },
    timestamp: { type: Date, default: Date.now, immutable: true },
  },
  { versionKey: false },
)

auditLogSchema.index({ timestamp: -1 })
auditLogSchema.index({ action: 1, timestamp: -1 })

for (const op of ['findOneAndUpdate', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'findOneAndReplace']) {
  auditLogSchema.pre(op, function preventMutation() {
    throw new Error('Audit logs are immutable')
  })
}
auditLogSchema.pre('save', function preventSaveUpdate(next) {
  if (!this.isNew) return next(new Error('Audit logs are immutable'))
  next()
})

export const AuditLog = mongoose.model('AuditLog', auditLogSchema)
