import { defineStore } from 'pinia'
import { ref } from 'vue'
import { notificationService } from '../services'

export const useNotificationStore = defineStore('notifications', () => {
  const count = ref(0)

  async function load() {
    try {
      const response = await notificationService.unreadCount()
      count.value = response.data.count
    } catch {
      count.value = 0
    }
  }

  function decrement(amount = 1) {
    count.value = Math.max(0, count.value - amount)
  }

  function clear() {
    count.value = 0
  }

  return { count, load, decrement, clear }
})
