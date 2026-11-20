<script setup>
import Icon from './Icon.vue'

defineProps({
  label: { type: String, required: true },
  value: { type: [Number, String], default: 0 },
  icon: { type: String, default: 'package' },
  tone: { type: String, default: '' },
  hint: { type: String, default: '' },
})
</script>

<template>
  <div class="card stat-card">
    <div>
      <div class="label">{{ label }}</div>
      <div class="value">{{ value }}</div>
      <div v-if="hint" class="hint">{{ hint }}</div>
    </div>
    <div class="stat-icon" :class="tone"><Icon :name="icon" :size="20" /></div>
  </div>
</template>
