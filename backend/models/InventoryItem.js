import mongoose from 'mongoose'
import { CATEGORIES, UNITS, stockStatus } from '../utils/constants.js'

const inventoryItemSchema = new mongoose.Schema(
  {
    itemCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 30,
      match: /^[A-Z0-9-]+$/,
    },
    itemName: { type: String, required: true, trim: true, maxlength: 150 },
    category: { type: String, required: true, enum: CATEGORIES },
    unit: { type: String, required: true, enum: UNITS },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    reorderLevel: { type: Number, required: true, min: 0, default: 0 },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
    archivedReason: { type: String, default: null },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
)

inventoryItemSchema.virtual('status').get(function statusGetter() {
  return stockStatus(this.quantity, this.reorderLevel)
})

inventoryItemSchema.index({ isArchived: 1, category: 1 })
inventoryItemSchema.index({ isArchived: 1, itemName: 1 })
inventoryItemSchema.index({ quantity: 1 })

export const InventoryItem = mongoose.model('InventoryItem', inventoryItemSchema)
