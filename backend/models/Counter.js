import mongoose from 'mongoose'

const counterSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0, min: 0 },
})

export const Counter = mongoose.model('Counter', counterSchema)

const revokedTokenSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
})

revokedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const RevokedToken = mongoose.model('RevokedToken', revokedTokenSchema)
