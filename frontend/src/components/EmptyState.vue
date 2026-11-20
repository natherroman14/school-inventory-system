<script setup>
import Icon from './Icon.vue'

defineProps({
  icon: { type: String, default: 'inbox' },
  title: { type: String, default: 'Nothing here yet' },
  message: { type: String, default: '' },
})
</script>

<template>
  <div class="empty-state">
    <div class="icon-wrap"><Icon :name="icon" :size="22" /></div>
    <h3>{{ title }}</h3>
    <p v-if="message">{{ message }}</p>
    <slot />
  </div>
</template>
