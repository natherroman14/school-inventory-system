import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authService } from '../services'
import { clearToken, getToken, setToken } from '../services/api'

const ADMIN_ROLES = ['CUSTODIAN', 'SUPPLY_OFFICER']

export const useAuthStore = defineStore('auth', () => {
  const token = ref(getToken())
  const user = ref(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => Boolean(token.value))
  const roleGroup = computed(() => (user.value && ADMIN_ROLES.includes(user.value.role) ? 'ADMIN' : 'REQUESTER'))
  const isAdmin = computed(() => roleGroup.value === 'ADMIN')
  const homeRoute = computed(() => (isAdmin.value ? '/custodian/dashboard' : '/dean/dashboard'))

  async function login(username, password) {
    loading.value = true
    try {
      const response = await authService.login(username, password)
      const data = response.data || response
      setToken(data.token)
      token.value = data.token
      user.value = data.user
      return data
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    if (!token.value) return null
    const response = await authService.me()
    user.value = response.data || response
    return user.value
  }

  function clearSession() {
    clearToken()
    token.value = null
    user.value = null
  }

  async function logout() {
    try {
      if (token.value) await authService.logout()
    } catch {
      // Clear the local session even if the server is unreachable.
    }
    clearSession()
  }

  return { token, user, loading, isAuthenticated, isAdmin, roleGroup, homeRoute, login, fetchMe, logout, clearSession }
})
