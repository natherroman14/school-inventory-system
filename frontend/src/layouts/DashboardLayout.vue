<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '../components/AppSidebar.vue'
import AppTopbar from '../components/AppTopbar.vue'
import ToastStack from '../components/ToastStack.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useAuthStore } from '../stores/auth'
import { notificationService, requestService } from '../services'

const route = useRoute()
const auth = useAuthStore()
const sidebarOpen = ref(false)
const badges = ref({ pending: 0, alerts: 0 })

const title = computed(() => route.meta.title || 'Dashboard')
const subtitle = computed(() => route.meta.subtitle || '')

async function loadBadges() {
  try {
    if (auth.isAdmin) {
      const [requests, alerts] = await Promise.all([
        requestService.list({ status: 'PENDING', limit: 1 }),
        notificationService.list({ scope: 'alerts', isRead: 'false', limit: 1 }),
      ])
      badges.value = { pending: requests.pagination?.total || 0, alerts: alerts.pagination?.total || 0 }
    } else {
      const requests = await requestService.list({ status: 'PENDING', limit: 1 })
      badges.value = { pending: requests.pagination?.total || 0, alerts: 0 }
    }
  } catch {
    badges.value = { pending: 0, alerts: 0 }
  }
}

onMounted(loadBadges)
watch(() => route.fullPath, () => {
  sidebarOpen.value = false
  loadBadges()
})
</script>

<template>
  <div class="app-shell">
    <AppSidebar :open="sidebarOpen" :badges="badges" @close="sidebarOpen = false" />
    <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false" />
    <div class="app-main">
      <AppTopbar :title="title" :subtitle="subtitle" @menu="sidebarOpen = !sidebarOpen" />
      <main class="main-content">
        <RouterView />
      </main>
      <footer class="app-footer">
        Eastern Samar State University &middot; Salcedo Campus &middot; Inventory Monitoring System
      </footer>
    </div>
    <ToastStack />
    <ConfirmDialog />
  </div>
</template>

<style scoped>
.app-shell { min-height: 100vh; }
.app-main { min-height: 100vh; margin-left: 258px; display: flex; flex-direction: column; transition: margin-left 0.2s ease; }
.main-content { flex: 1; padding: 26px 30px 10px; width: 100%; max-width: 1600px; margin: 0 auto; }
.app-footer { padding: 14px 30px 22px; font-size: 0.74rem; color: var(--muted); text-align: center; }
.sidebar-overlay { display: none; }
@media (max-width: 1024px) {
  .app-main { margin-left: 0; }
  .main-content { padding: 20px 18px 10px; }
  .sidebar-overlay { display: block; position: fixed; inset: 0; background: rgba(8, 41, 28, 0.35); z-index: 40; }
}
</style>
