<script setup>
import EmptyState from './EmptyState.vue'
import Icon from './Icon.vue'

const props = defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  emptyTitle: { type: String, default: 'No records found' },
  emptyMessage: { type: String, default: 'Try adjusting your search or filters.' },
  rowKey: { type: String, default: '_id' },
})

function valueOf(row, key) {
  return String(key).split('.').reduce((value, part) => (value == null ? value : value[part]), row)
}

function display(row, column) {
  const value = typeof column.key === 'function' ? column.key(row) : valueOf(row, column.key)
  if (value === null || value === undefined || value === '') return '—'
  if (column.format) return column.format(value, row)
  if (value instanceof Date) return value.toLocaleDateString('en-PH')
  if (typeof value === 'object') return value.fullName || value.itemName || value.requestNumber || JSON.stringify(value)
  return String(value)
}
</script>

<template>
  <div class="table-wrap">
    <table class="data-table">
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key" :class="column.class">{{ column.label }}</th>
        </tr>
      </thead>
      <tbody v-if="loading">
        <tr v-for="index in 5" :key="index">
          <td v-for="(column, columnIndex) in columns" :key="columnIndex">
            <span class="skeleton" :style="{ width: `${55 + ((index * 13 + columnIndex * 7) % 40)}%` }" />
          </td>
        </tr>
      </tbody>
      <tbody v-else-if="rows.length">
        <tr v-for="row in rows" :key="row[rowKey] || row._id || row.transactionId">
          <td v-for="column in columns" :key="column.key" :class="column.class">
            <slot :name="`cell-${column.key}`" :row="row" :value="valueOf(row, column.key)">
              {{ display(row, column) }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
    <EmptyState v-if="!loading && !rows.length" :title="emptyTitle" :message="emptyMessage" />
  </div>
</template>

<style scoped>
.skeleton { display: block; height: 11px; border-radius: 6px; background: linear-gradient(90deg, #edf3ee, #f7faf8, #edf3ee); background-size: 200% 100%; animation: shimmer 1.3s infinite; }
@keyframes shimmer { to { background-position: -200% 0; } }
</style>
