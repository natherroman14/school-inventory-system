import mongoose from 'mongoose'
import { config } from './env.js'

mongoose.set('strictQuery', true)

export async function connectDB(uri = config.mongoUri) {
  if (!uri) throw new Error('MONGODB_URI is not configured. Copy backend/.env.example to backend/.env and set it.')
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 })
  return mongoose.connection
}

export async function disconnectDB() {
  await mongoose.disconnect()
}
