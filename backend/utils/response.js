export function sendSuccess(res, data = null, message = null, statusCode = 200) {
  return res.status(statusCode).json({ success: true, ...(message ? { message } : {}), data })
}

export function sendPaginated(res, { items, total, page, limit }, extra = {}) {
  return res.status(200).json({
    success: true,
    data: items,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    ...extra,
  })
}
