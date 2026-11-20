import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { config } from './config/env.js'
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js'
import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import inventoryRoutes from './routes/inventoryRoutes.js'
import requestRoutes from './routes/requestRoutes.js'
import transactionRoutes from './routes/transactionRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import reportRoutes from './routes/reportRoutes.js'
import auditRoutes from './routes/auditRoutes.js'
import dashboardRoutes from './routes/dashboardRoutes.js'

export function createApp() {
  const app = express()
  app.set('trust proxy', 1)
  app.disable('x-powered-by')
  app.use(helmet())
  app.use(cors({ origin: config.clientOrigin.split(',').map((origin) => origin.trim()), credentials: true }))
  app.use(express.json({ limit: '1mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(compression())

  app.get('/api/health', (_req, res) => res.json({ success: true, data: { status: 'ok', service: 'essu-inventory-api' } }))
  app.use('/api/auth', authRoutes)
  app.use('/api/users', userRoutes)
  app.use('/api/inventory', inventoryRoutes)
  app.use('/api/requests', requestRoutes)
  app.use('/api/transactions', transactionRoutes)
  app.use('/api/notifications', notificationRoutes)
  app.use('/api/reports', reportRoutes)
  app.use('/api/audit-logs', auditRoutes)
  app.use('/api/dashboard', dashboardRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)
  return app
}
