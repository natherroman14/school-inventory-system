export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.details = details
  }
}

export const badRequest = (message, details) => new ApiError(400, message, details)
export const unauthorized = (message = 'Authentication required') => new ApiError(401, message)
export const forbidden = (message = 'You are not allowed to perform this action') => new ApiError(403, message)
export const notFound = (message = 'Resource not found') => new ApiError(404, message)
export const conflict = (message) => new ApiError(409, message)
