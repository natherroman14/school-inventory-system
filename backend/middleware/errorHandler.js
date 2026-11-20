import mongoose from 'mongoose'
import { ApiError } from '../utils/apiError.js'
import { config } from '../config/env.js'

export function notFoundHandler(req, _res, next) {
  next(new ApiError(404, `Endpoint ${req.method} ${req.originalUrl} was not found`))
}

export function errorHandler(error, _req, res, _next) {
  let status = error.statusCode || error.status || 500
  let message = error.message || 'Something went wrong'
  let details = error.details || null

  if (error instanceof ApiError) {
    status = error.statusCode
    message = error.message
    details = error.details
  } else if (error instanceof mongoose.Error.ValidationError) {
    status = 400
    message = Object.values(error.errors).map((e) => e.message).join('; ')
  } else if (error instanceof mongoose.Error.CastError) {
    status = 400
    message = `Invalid value for ${error.path}`
  } else if (error.code === 11000) {
    status = 409
    const field = Object.keys(error.keyPattern || {})[0] || 'value'
    message = `${field} already exists`
  } else if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
    status = 401
    message = 'Invalid or expired session. Please log in again'
  } else if (error.code === 20 || /transaction numbers are only allowed/i.test(message)) {
    status = 500
    message = 'This operation requires a replica set-enabled MongoDB deployment'
  }

  if (status >= 500 && config.env === 'production') {
    // Keep internal details out of production responses.
    message = message === 'This operation requires a replica set-enabled MongoDB deployment'
      ? message
      : 'Internal server error'
    details = null
  }

  if (status >= 500) console.error(error)

  res.status(status).json({ success: false, error: { message, ...(details ? { details } : {}) } })
}
