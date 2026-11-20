import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const toasts = ref([])
  const confirmation = ref(null)
  let resolver = null

  function notify(message, type = 'success') {
    const id = `${Date.now()}-${Math.random()}`
    toasts.value.push({ id, message, type })
    setTimeout(() => dismiss(id), 4500)
  }

  function dismiss(id) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function confirm(options) {
    confirmation.value = {
      title: 'Please confirm',
      message: 'Are you sure you want to continue?',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      danger: false,
      ...options,
    }
    return new Promise((resolve) => { resolver = resolve })
  }

  function answerConfirm(value) {
    if (resolver) resolver(value)
    resolver = null
    confirmation.value = null
  }

  return { toasts, confirmation, notify, dismiss, confirm, answerConfirm }
})
