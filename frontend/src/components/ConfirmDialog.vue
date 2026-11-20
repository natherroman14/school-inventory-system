<script setup>
import Icon from './Icon.vue'
import { useUiStore } from '../stores/ui'

const ui = useUiStore()
</script>

<template>
  <div v-if="ui.confirmation" class="modal-backdrop">
    <div class="confirm-card card" role="alertdialog" aria-modal="true">
      <div class="confirm-icon" :class="{ danger: ui.confirmation.danger }">
        <Icon :name="ui.confirmation.danger ? 'warning' : 'info'" :size="22" />
      </div>
      <h2>{{ ui.confirmation.title }}</h2>
      <p>{{ ui.confirmation.message }}</p>
      <div class="actions">
        <button class="btn btn-outline" @click="ui.answerConfirm(false)">{{ ui.confirmation.cancelText }}</button>
        <button class="btn" :class="ui.confirmation.danger ? 'btn-danger' : 'btn-primary'" @click="ui.answerConfirm(true)">
          {{ ui.confirmation.confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirm-card { width: min(420px, calc(100vw - 32px)); padding: 24px; text-align: center; }
.confirm-icon { display: grid; place-items: center; width: 46px; height: 46px; margin: 0 auto 14px; border-radius: 50%; background: var(--green-50); color: var(--green-700); }
.confirm-icon.danger { background: var(--red-bg); color: var(--red); }
.confirm-card h2 { font-size: 1.05rem; margin-bottom: 8px; }
.confirm-card p { color: var(--muted); font-size: 0.85rem; margin-bottom: 20px; }
.actions { display: flex; justify-content: center; gap: 10px; }
</style>
