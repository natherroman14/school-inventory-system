import rateLimit from 'express-rate-limit'
import { config } from '../config/env.js'

export const authLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  limit: config.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many attempts. Please try again later.' } },
})
