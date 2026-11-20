import mongoose from 'mongoose'
import { TRANSACTION_TYPES } from '../utils/constants.js'

const stockTransactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, required: true, unique: true, trim: true, uppercase: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    quantity: { type: Number, required: true, min: 1 },
    transactionType: { type: String, required: true, enum: TRANSACTION_TYPES },
    previousQuantity: { type: Number, required: true, min: 0 },
    newQuantity: { type: Number, required: true, min: 0 },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    relatedRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'SupplyRequest', default: null },
    note: { type: String, default: '', trim: true, maxlength: 300 },
  },
  { timestamps: true },
)

stockTransactionSchema.index({ transactionType: 1, createdAt: -1 })
stockTransactionSchema.index({ item: 1, createdAt: -1 })
stockTransactionSchema.index({ relatedRequest: 1 })

export const StockTransaction = mongoose.model('StockTransaction', stockTransactionSchema)
