<script setup>
import Icon from './Icon.vue'

const props = defineProps({
  page: { type: Number, default: 1 },
  limit: { type: Number, default: 25 },
  total: { type: Number, default: 0 },
  pages: { type: Number, default: 1 },
})
const emit = defineEmits(['update:page'])

const visiblePages = () => {
  const start = Math.max(1, props.page - 2)
  const end = Math.min(props.pages, start + 4)
  const result = []
  for (let index = start; index <= end; index += 1) result.push(index)
  return result
}
</script>

<template>
  <div class="pagination no-print">
    <span>Showing {{ total ? (page - 1) * limit + 1 : 0 }}–{{ Math.min(page * limit, total) }} of {{ total }}</span>
    <div class="pages">
      <button class="btn-icon" :disabled="page <= 1" aria-label="Previous page" @click="emit('update:page', page - 1)"><Icon name="chevronLeft" :size="16" /></button>
      <button
        v-for="number in visiblePages()"
        :key="number"
        class="page-number"
        :class="{ active: number === page }"
        @click="emit('update:page', number)"
      >{{ number }}</button>
      <button class="btn-icon" :disabled="page >= pages" aria-label="Next page" @click="emit('update:page', page + 1)"><Icon name="chevronRight" :size="16" /></button>
    </div>
  </div>
</template>

<style scoped>
.page-number { min-width: 30px; height: 30px; border: 1px solid var(--line); border-radius: 7px; background: #fff; color: var(--muted); font-size: 0.78rem; }
.page-number.active { background: var(--green-700); border-color: var(--green-700); color: #fff; font-weight: 700; }
</style>
