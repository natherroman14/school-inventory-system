import { http } from './api'

export const authService = {
  login: (username, password) => http.post('/auth/login', { username, password }),
  logout: () => http.post('/auth/logout'),
  me: () => http.get('/auth/me'),
  changePassword: (currentPassword, newPassword) => http.patch('/auth/password', { currentPassword, newPassword }),
}

export const dashboardService = {
  get: () => http.get('/dashboard'),
}

export const inventoryService = {
  list: (params) => http.get('/inventory', params),
  options: () => http.get('/inventory/options'),
  get: (id) => http.get(`/inventory/${id}`),
  create: (payload) => http.post('/inventory', payload),
  update: (id, payload) => http.put(`/inventory/${id}`, payload),
  archive: (id) => http.delete(`/inventory/${id}`),
  checkCode: (code, excludeId) => http.get('/inventory/check-code', { code, excludeId }),
}

export const requestService = {
  list: (params) => http.get('/requests', params),
  get: (id) => http.get(`/requests/${id}`),
  create: (payload) => http.post('/requests', payload),
  approve: (id, remarks) => http.patch(`/requests/${id}/approve`, { remarks }),
  reject: (id, remarks) => http.patch(`/requests/${id}/reject`, { remarks }),
  fulfill: (id) => http.patch(`/requests/${id}/fulfill`),
}

export const transactionService = {
  list: (params) => http.get('/transactions', params),
  stockIn: (payload) => http.post('/transactions/stock-in', payload),
}

export const notificationService = {
  list: (params) => http.get('/notifications', params),
  unreadCount: () => http.get('/notifications/unread-count'),
  markRead: (id) => http.patch(`/notifications/${id}/read`),
  markAllRead: () => http.patch('/notifications/read-all'),
}

export const reportService = {
  get: (type, params) => http.get(`/reports/${type}`, params),
  metadata: () => http.get('/reports/metadata'),
}

export const userService = {
  list: (params) => http.get('/users', params),
  create: (payload) => http.post('/users', payload),
  update: (id, payload) => http.put(`/users/${id}`, payload),
  setStatus: (id, isActive) => http.patch(`/users/${id}/status`, { isActive }),
  resetPassword: (id, newPassword) => http.patch(`/users/${id}/password`, { newPassword }),
  departments: () => http.get('/users/departments'),
}

export const auditService = {
  list: (params) => http.get('/audit-logs', params),
}
