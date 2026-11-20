<script setup>
import Icon from './Icon.vue'

defineProps({
  title: { type: String, required: true },
  wide: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])
</script>

<template>
  <div class="modal-backdrop" @click.self="emit('close')">
    <div class="modal" :class="{ 'modal-wide': wide }" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h2>{{ title }}</h2>
        <button class="btn-icon" aria-label="Close" @click="emit('close')"><Icon name="x" :size="18" /></button>
      </div>
      <div class="modal-body"><slot /></div>
      <div v-if="$slots.footer" class="modal-footer"><slot name="footer" /></div>
    </div>
  </div>
</template>
