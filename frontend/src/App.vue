<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()
const router = useRouter()

function handleExpired() {
  auth.clearSession()
  router.push('/login')
}

onMounted(() => window.addEventListener('auth:expired', handleExpired))
onUnmounted(() => window.removeEventListener('auth:expired', handleExpired))
</script>

<template>
  <RouterView />
</template>
