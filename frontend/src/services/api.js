import axios from 'axios'

const TOKEN_KEY = 'essu_inventory_token'
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

const client = axios.create({ baseURL, timeout: 20000 })

client.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const message = error.response?.data?.error?.message || error.message || 'Unable to complete the request'
    if (status === 401 && !String(error.config?.url || '').includes('/auth/login')) {
      clearToken()
      window.dispatchEvent(new CustomEvent('auth:expired'))
    }
    return Promise.reject(new Error(message))
  },
)

export const http = {
  get: (url, params) => client.get(url, { params }).then((response) => response.data),
  post: (url, body) => client.post(url, body).then((response) => response.data),
  put: (url, body) => client.put(url, body).then((response) => response.data),
  patch: (url, body) => client.patch(url, body || {}).then((response) => response.data),
  delete: (url) => client.delete(url).then((response) => response.data),
}

export default client
