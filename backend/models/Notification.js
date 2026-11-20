import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    title: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    type: {
      type: String,
      required: true,
      enum: ['REQUEST_SUBMITTED', 'REQUEST_APPROVED', 'REQUEST_REJECTED', 'REQUEST_FULFILLED', 'LOW_STOCK', 'OUT_OF_STOCK', 'SYSTEM'],
    },
    isRead: { type: Boolean, default: false },
    status: { type: String, enum: ['ACTIVE', 'RESOLVED', 'NONE'], default: 'NONE' },
    relatedItem: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', default: null },
    relatedRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'SupplyRequest', default: null },
  },
  { timestamps: true },
)

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 })
notificationSchema.index({ type: 1, status: 1, relatedItem: 1, createdAt: -1 })

export const Notification = mongoose.model('Notification', notificationSchema)
