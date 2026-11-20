<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Icon from './Icon.vue'
import { useAuthStore } from '../stores/auth'
import { useNotificationStore } from '../stores/notifications'
import { useUiStore } from '../stores/ui'
import { notificationService } from '../services'
import { ROLE_LABELS } from '../utils/constants'
import { formatDate, initials } from '../utils/format'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
const emit = defineEmits(['menu'])

const router = useRouter()
const auth = useAuthStore()
const notifications = useNotificationStore()
const ui = useUiStore()
const open = ref(false)
const menuOpen = ref(false)
const items = ref([])
const dropdown = ref(null)

async function loadNotifications() {
  try {
    const response = await notificationService.list({ limit: 5 })
    items.value = response.data
    await notifications.load()
  } catch {
    items.value = []
  }
}

function toggle() {
  open.value = !open.value
  if (open.value) loadNotifications()
}

async function visitNotification(note) {
  open.value = false
  if (!note.isRead) {
    try {
      await notificationService.markRead(note._id)
      notifications.decrement()
    } catch { /* notification may already be read */ }
  }
  if (note.relatedRequest) router.push(auth.isAdmin ? '/custodian/requests' : '/dean/requests')
  else if (note.relatedItem) router.push(auth.isAdmin ? '/custodian/alerts' : '/dean/inventory')
}

async function logout() {
  const confirmed = await ui.confirm({
    title: 'Sign out?',
    message: 'You will need to sign in again to continue.',
    confirmText: 'Sign out',
  })
  if (!confirmed) return
  await auth.logout()
  notifications.clear()
  router.push('/login')
}

function handleDocumentClick(event) {
  if (open.value && dropdown.value && !dropdown.value.contains(event.target)) open.value = false
  if (menuOpen.value && event.target.closest?.('.profile-menu-host') === null) menuOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  notifications.load()
})
onUnmounted(() => document.removeEventListener('click', handleDocumentClick))
</script>

<template>
  <header class="topbar">
    <button class="menu-button" aria-label="Toggle navigation" @click="emit('menu')"><Icon name="menu" :size="20" /></button>
    <div class="heading">
      <h1>{{ title }}</h1>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>
    <div class="top-actions">
      <div ref="dropdown" class="notification-host">
        <button class="icon-button" aria-label="Notifications" @click="toggle">
          <Icon name="bell" :size="19" />
          <span v-if="notifications.count" class="dot">{{ notifications.count > 9 ? '9+' : notifications.count }}</span>
        </button>
        <div v-if="open" class="notification-panel card">
          <div class="panel-head">
            <strong>Notifications</strong>
            <button class="link-button" @click="notificationService.markAllRead().then(notifications.clear()); open = false">Mark all read</button>
          </div>
          <div v-if="items.length" class="notification-list">
            <button v-for="note in items" :key="note._id" class="notification-item" @click="visitNotification(note)">
              <span class="note-icon" :class="note.type.toLowerCase()"><Icon :name="note.type.includes('FULFILLED') || note.type.includes('APPROVED') ? 'check' : note.type.includes('REJECTED') ? 'x' : 'bell'" :size="16" /></span>
              <span class="note-copy">
                <strong>{{ note.title }}</strong>
                <small>{{ note.message }}</small>
                <small class="muted">{{ formatDate(note.createdAt, true) }}</small>
              </span>
              <span v-if="!note.isRead" class="unread-dot" />
            </button>
          </div>
          <div v-else class="panel-empty">No notifications yet.</div>
        </div>
      </div>

      <div class="profile-menu-host">
        <button class="profile-button" @click="menuOpen = !menuOpen">
          <span class="avatar">{{ initials(auth.user?.fullName) }}</span>
          <span class="profile-copy">
            <strong>{{ auth.user?.fullName || 'User' }}</strong>
            <small>{{ ROLE_LABELS[auth.user?.role] || '' }}</small>
          </span>
          <Icon name="chevronDown" :size="15" />
        </button>
        <div v-if="menuOpen" class="profile-menu card">
          <RouterLink :to="auth.isAdmin ? '/custodian/profile' : '/dean/profile'" @click="menuOpen = false">
            <Icon name="user" :size="16" /> My profile
          </RouterLink>
          <button @click="logout"><Icon name="logout" :size="16" /> Log out</button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar { position: sticky; top: 0; z-index: 30; display: flex; align-items: center; gap: 16px; min-height: 72px; padding: 12px 30px; background: rgba(255,255,255,0.96); border-bottom: 1px solid var(--line); backdrop-filter: blur(6px); }
.menu-button { display: none; background: none; border: 0; color: var(--green-800); padding: 6px; }
.heading { flex: 1; min-width: 0; }
.heading h1 { font-size: 1.05rem; font-weight: 700; margin: 0; }
.heading p { margin: 2px 0 0; font-size: 0.76rem; color: var(--muted); }
.top-actions { display: flex; align-items: center; gap: 12px; }
.icon-button { position: relative; display: grid; place-items: center; width: 38px; height: 38px; border: 1px solid var(--line); border-radius: 10px; background: #fff; color: var(--green-800); }
.icon-button:hover { background: var(--green-50); }
.dot { position: absolute; top: -5px; right: -5px; min-width: 18px; height: 18px; display: grid; place-items: center; border-radius: 9px; background: #c0392b; color: #fff; font-size: 0.62rem; font-weight: 800; padding: 0 4px; }
.notification-host, .profile-menu-host { position: relative; }
.notification-panel { position: absolute; right: 0; top: 46px; width: 340px; overflow: hidden; }
.panel-head { display: flex; align-items: center; justify-content: space-between; padding: 13px 15px; border-bottom: 1px solid var(--line); font-size: 0.84rem; }
.link-button { border: 0; background: none; color: var(--green-700); font-size: 0.74rem; font-weight: 600; }
.notification-list { max-height: 350px; overflow-y: auto; }
.notification-item { display: flex; align-items: flex-start; gap: 10px; width: 100%; text-align: left; padding: 11px 14px; background: #fff; border: 0; border-bottom: 1px solid #f0f4f1; }
.notification-item:hover { background: var(--green-50); }
.note-icon { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; background: var(--green-50); color: var(--green-700); flex-shrink: 0; }
.note-icon.request_rejected { background: var(--red-bg); color: var(--red); }
.note-icon.low_stock, .note-icon.out_of_stock { background: var(--amber-bg); color: var(--amber); }
.note-copy { display: grid; gap: 2px; min-width: 0; }
.note-copy strong { font-size: 0.79rem; }
.note-copy small { font-size: 0.74rem; color: var(--muted); line-height: 1.35; }
.unread-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--green-600); margin: 5px 0 0 auto; flex-shrink: 0; }
.panel-empty { padding: 28px; text-align: center; color: var(--muted); font-size: 0.82rem; }
.profile-button { display: flex; align-items: center; gap: 9px; padding: 4px 8px 4px 4px; border: 1px solid transparent; border-radius: 10px; background: transparent; color: var(--ink); }
.profile-button:hover { border-color: var(--line); background: var(--green-50); }
.avatar { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; background: var(--green-700); color: #fff; font-weight: 700; font-size: 0.78rem; }
.profile-copy { text-align: left; line-height: 1.25; }
.profile-copy strong { display: block; font-size: 0.78rem; }
.profile-copy small { color: var(--muted); font-size: 0.68rem; }
.profile-menu { position: absolute; right: 0; top: 50px; width: 190px; padding: 6px; }
.profile-menu a, .profile-menu button { display: flex; align-items: center; gap: 9px; width: 100%; padding: 9px 10px; border: 0; border-radius: 7px; background: none; color: var(--ink); font-size: 0.82rem; text-align: left; }
.profile-menu a:hover, .profile-menu button:hover { background: var(--green-50); color: var(--green-800); }
@media (max-width: 1024px) { .menu-button { display: block; } .topbar { padding: 10px 18px; } }
@media (max-width: 640px) { .profile-copy, .profile-button > svg { display: none; } .notification-panel { width: min(340px, calc(100vw - 30px)); right: -46px; } }
</style>
