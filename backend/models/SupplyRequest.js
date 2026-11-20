import mongoose from 'mongoose'
import { REQUEST_STATUSES } from '../utils/constants.js'

const requestItemSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    itemCode: { type: String, required: true },
    itemName: { type: String, required: true },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    availableAtRequest: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const supplyRequestSchema = new mongoose.Schema(
  {
    requestNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: String, required: true, trim: true },
    items: { type: [requestItemSchema], required: true, validate: (v) => v.length > 0 },
    purpose: { type: String, required: true, trim: true, maxlength: 500 },
    dateNeeded: { type: Date, required: true },
    status: { type: String, required: true, enum: REQUEST_STATUSES, default: 'PENDING' },
    remarks: { type: String, default: '', trim: true, maxlength: 500 },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },
    fulfilledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    fulfilledAt: { type: Date, default: null },
  },
  { timestamps: true },
)

supplyRequestSchema.index({ status: 1, createdAt: -1 })
supplyRequestSchema.index({ requestedBy: 1, createdAt: -1 })
supplyRequestSchema.index({ department: 1, createdAt: -1 })

supplyRequestSchema.virtual('requester', {
  ref: 'User',
  localField: 'requestedBy',
  foreignField: '_id',
  justOne: true,
})

export const SupplyRequest = mongoose.model('SupplyRequest', supplyRequestSchema)
