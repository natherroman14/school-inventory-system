<script setup>
import Icon from './Icon.vue'
import { useUiStore } from '../stores/ui'

const ui = useUiStore()
</script>

<template>
  <div class="toast-stack">
    <div v-for="toast in ui.toasts" :key="toast.id" class="toast" :class="toast.type">
      <Icon :name="toast.type === 'error' ? 'warning' : toast.type === 'warning' ? 'info' : 'check'" :size="17" />
      <span style="flex: 1">{{ toast.message }}</span>
      <button class="btn-icon" aria-label="Dismiss" @click="ui.dismiss(toast.id)"><Icon name="x" :size="14" /></button>
    </div>
  </div>
</template>
