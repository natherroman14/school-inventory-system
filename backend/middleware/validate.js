import { validationResult } from 'express-validator'
import { badRequest } from '../utils/apiError.js'

export function handleValidation(req, _res, next) {
  const result = validationResult(req)
  if (result.isEmpty()) return next()
  const errors = result.array().map((item) => ({ field: item.path || item.param, message: item.msg }))
  next(badRequest(errors[0]?.message || 'Invalid input', errors))
}
