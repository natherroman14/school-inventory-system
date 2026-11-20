<script setup>
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { adminNavigation, requesterNavigation } from '../utils/navigation'
import { ROLE_LABELS, SYSTEM_NAME } from '../utils/constants'
import Icon from './Icon.vue'

defineProps({
  open: { type: Boolean, default: false },
  badges: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['close'])

const auth = useAuthStore()
const navigation = computed(() => (auth.isAdmin ? adminNavigation : requesterNavigation))
</script>

<template>
  <aside class="sidebar" :class="{ open }">
    <div class="brand">
      <div class="brand-mark">ESSU</div>
      <div class="brand-copy">
        <strong>Essu Salcedo</strong>
        <span>Supply Inventory System</span>
      </div>
      <button class="close-btn" aria-label="Close navigation" @click="emit('close')"><Icon name="x" :size="18" /></button>
    </div>
    <nav class="nav">
      <div v-for="section in navigation" :key="section.label" class="nav-section">
        <p class="nav-label">{{ section.label }}</p>
        <RouterLink
          v-for="item in section.items"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          active-class="active"
        >
          <Icon :name="item.icon" :size="18" />
          <span>{{ item.title }}</span>
          <span v-if="item.badgeKey && badges[item.badgeKey]" class="nav-badge">{{ badges[item.badgeKey] }}</span>
        </RouterLink>
      </div>
    </nav>
    <div class="sidebar-foot">
      <div class="user-avatar">{{ (auth.user?.fullName || 'U').slice(0, 1) }}</div>
      <div class="user-copy">
        <strong>{{ auth.user?.fullName || 'User' }}</strong>
        <span>{{ ROLE_LABELS[auth.user?.role] || 'Authorized User' }}</span>
      </div>
    </div>
    <p class="system-name">{{ SYSTEM_NAME }}</p>
  </aside>
</template>

<style scoped>
.sidebar { position: fixed; inset: 0 auto 0 0; width: 258px; background: linear-gradient(180deg, var(--green-900), var(--green-950)); color: #e7f3ea; display: flex; flex-direction: column; z-index: 50; overflow-y: auto; }
.brand { display: flex; align-items: center; gap: 11px; padding: 22px 18px 18px; border-bottom: 1px solid rgba(255,255,255,0.1); }
.brand-mark { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 10px; background: #fff; color: var(--green-900); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.04em; flex-shrink: 0; }
.brand-copy strong { display: block; font-size: 0.9rem; color: #fff; }
.brand-copy span { font-size: 0.7rem; color: #9fc4ad; }
.close-btn { display: none; margin-left: auto; background: none; border: 0; color: #cbe3d3; }
.nav { flex: 1; padding: 16px 10px; }
.nav-section + .nav-section { margin-top: 20px; }
.nav-label { margin: 0 10px 8px; color: #7fae91; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.09em; }
.nav-item { display: flex; align-items: center; gap: 11px; padding: 9px 11px; border-radius: 9px; color: #c6ddcd; font-size: 0.83rem; font-weight: 500; margin-bottom: 2px; transition: background 0.15s, color 0.15s; }
.nav-item:hover { background: rgba(255,255,255,0.07); color: #fff; }
.nav-item.active { background: var(--green-600); color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
.nav-badge { margin-left: auto; background: #f2c14e; color: #4a3400; border-radius: 999px; min-width: 19px; padding: 1px 6px; font-size: 0.68rem; font-weight: 800; text-align: center; }
.sidebar-foot { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-top: 1px solid rgba(255,255,255,0.1); }
.user-avatar { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; background: var(--green-200); color: var(--green-900); font-weight: 800; }
.user-copy strong { display: block; font-size: 0.79rem; color: #fff; }
.user-copy span { font-size: 0.68rem; color: #9fc4ad; }
.system-name { margin: 0; padding: 0 16px 16px; font-size: 0.6rem; line-height: 1.4; color: #6c9b7e; text-align: center; }
@media (max-width: 1024px) {
  .sidebar { transform: translateX(-100%); transition: transform 0.2s ease; }
  .sidebar.open { transform: translateX(0); }
  .close-btn { display: block; }
}
</style>
