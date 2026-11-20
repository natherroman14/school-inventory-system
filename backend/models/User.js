import mongoose from 'mongoose'
import bcrypt from 'bcrypt'
import { ALL_ROLES } from '../utils/constants.js'

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 40,
      match: /^[a-z0-9._-]+$/,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: ALL_ROLES },
    department: { type: String, required: true, trim: true, maxlength: 120 },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

userSchema.index({ role: 1, isActive: 1 })
userSchema.index({ department: 1 })

userSchema.methods.verifyPassword = function verifyPassword(plain) {
  return bcrypt.compare(plain, this.passwordHash)
}

userSchema.statics.hashPassword = function hashPassword(plain) {
  return bcrypt.hash(plain, 12)
}

userSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject()
  delete obj.passwordHash
  delete obj.__v
  return obj
}

export const User = mongoose.model('User', userSchema)
