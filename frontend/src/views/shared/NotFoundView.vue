<script setup>
import Icon from '../../components/Icon.vue'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
</script>

<template>
  <div class="not-found card">
    <Icon name="warning" :size="34" />
    <h1>Page not found</h1>
    <p>The page you are looking for does not exist or is not available to your role.</p>
    <RouterLink class="btn btn-primary" :to="auth.isAuthenticated ? auth.homeRoute : '/login'">Go to dashboard</RouterLink>
  </div>
</template>

<style scoped>
.not-found { display: grid; justify-items: center; gap: 12px; max-width: 480px; margin: 10vh auto; padding: 44px; text-align: center; color: var(--green-700); }
.not-found h1 { color: var(--ink); font-size: 1.3rem; margin: 0; }
.not-found p { color: var(--muted); margin: 0 0 8px; }
</style>
