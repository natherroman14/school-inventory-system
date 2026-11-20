<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import DataTable from '../../components/DataTable.vue'
import Pagination from '../../components/Pagination.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import Icon from '../../components/Icon.vue'
import { notificationService } from '../../services'
import { useUiStore } from '../../stores/ui'
import { formatDateTime, formatNumber, humanize } from '../../utils/format'

const ui = useUiStore()

const columns = [
  { key: 'title', label: 'Alert', class: 'strong' },
  { key: 'type', label: 'Type' },
  { key: 'relatedItem', label: 'Item Details' },
  { key: 'message', label: 'Message' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Date' },
  { key: 'isRead', label: 'Read' },
  { key: 'actions', label: 'Actions', class: 'actions' },
]

const alerts = ref([])
const loading = ref(true)
const error = ref('')
const readFilter = ref('')
const page = ref(1)
const limit = ref(25)
const pagination = ref({ total: 0, page: 1, limit: 25, pages: 1 })
const unreadCount = ref(0)
const markingId = ref(null)
const markingAll = ref(false)

const activeCount = computed(() => alerts.value.filter((alert) => alert.status === 'ACTIVE').length)

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await notificationService.list({
      scope: 'alerts',
      page: page.value,
      limit: limit.value,
      isRead: readFilter.value || undefined,
    })
    alerts.value = response.data || []
    pagination.value = response.pagination || {
      total: alerts.value.length,
      page: page.value,
      limit: limit.value,
      pages: 1,
    }
  } catch (err) {
    error.value = err.message
    ui.notify(err.message, 'error')
  } finally {
    loading.value = false
  }
}

async function loadUnreadCount() {
  try {
    const response = await notificationService.unreadCount()
    const value = response.data
    unreadCount.value = Number(value?.count ?? value ?? 0)
  } catch (err) {
    ui.notify(err.message, 'error')
  }
}

function onPageChange(value) {
  page.value = value
  load()
}

function resetFilters() {
  readFilter.value = ''
  page.value = 1
  load()
}

watch(readFilter, () => {
  page.value = 1
  load()
})

async function markRead(alert) {
  markingId.value = alert._id
  try {
    await notificationService.markRead(alert._id)
    ui.notify('Alert marked as read.', 'success')
    await Promise.all([load(), loadUnreadCount()])
  } catch (err) {
    error.value = err.message
    ui.notify(err.message, 'error')
  } finally {
    markingId.value = null
  }
}

async function markAllRead() {
  markingAll.value = true
  try {
    await notificationService.markAllRead()
    ui.notify('All alerts marked as read.', 'success')
    await Promise.all([load(), loadUnreadCount()])
  } catch (err) {
    error.value = err.message
    ui.notify(err.message, 'error')
  } finally {
    markingAll.value = false
  }
}

onMounted(() => {
  load()
  loadUnreadCount()
})
</script>

<template>
  <div class="stack">
    <div class="page-header">
      <div>
        <h1>Low-Stock Alerts</h1>
        <p>Review replenishment notices and track which alerts have been acknowledged.</p>
      </div>
      <div class="page-actions">
        <RouterLink class="btn btn-outline" to="/custodian/inventory"><Icon name="package" :size="16" /> Manage Inventory</RouterLink>
        <button class="btn btn-soft" :disabled="markingAll || unreadCount === 0" @click="markAllRead">
          <Icon name="check" :size="16" /> {{ markingAll ? 'Updating…' : 'Mark All as Read' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="alert alert-error">
      <Icon name="warning" :size="16" />
      <span>{{ error }}</span>
      <button class="btn btn-sm btn-outline" @click="load">Retry</button>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>Notifications</h2>
        <div class="row wrap">
          <span class="badge badge-amber">{{ activeCount }} active on this page</span>
          <span class="badge badge-blue">{{ unreadCount }} unread</span>
        </div>
      </div>
      <div class="card-body">
        <div class="toolbar">
          <select v-model="readFilter" class="select" aria-label="Filter by read status">
            <option value="">All alerts</option>
            <option value="false">Unread</option>
            <option value="true">Read</option>
          </select>
          <button class="btn btn-outline" :disabled="loading" @click="load"><Icon name="refresh" :size="16" /> Refresh</button>
          <button class="btn btn-outline btn-sm" @click="resetFilters"><Icon name="x" :size="14" /> Clear filters</button>
          <span class="spacer" />
          <span class="muted small">{{ formatNumber(pagination.total) }} alerts</span>
        </div>

        <DataTable
          :columns="columns"
          :rows="alerts"
          :loading="loading"
          row-key="_id"
          empty-title="No alerts found"
          empty-message="There are no alerts matching the current filter."
        >
          <template #cell-type="{ row }">
            <StatusBadge :status="row.type" :label="humanize(row.type)" />
          </template>
          <template #cell-relatedItem="{ row }">
            <div v-if="row.relatedItem" class="stack-tight">
              <strong>{{ row.relatedItem.itemName }}</strong>
              <span class="muted small">
                {{ row.relatedItem.itemCode }} · {{ formatNumber(row.relatedItem.quantity) }} /
                {{ formatNumber(row.relatedItem.reorderLevel) }} {{ row.relatedItem.unit }}
              </span>
            </div>
            <span v-else class="muted">Item unavailable</span>
          </template>
          <template #cell-message="{ row }"><span class="truncate">{{ row.message }}</span></template>
          <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
          <template #cell-createdAt="{ row }">{{ formatDateTime(row.createdAt) }}</template>
          <template #cell-isRead="{ row }">
            <span class="badge" :class="row.isRead ? 'badge-gray' : 'badge-blue'">{{ row.isRead ? 'Read' : 'Unread' }}</span>
          </template>
          <template #cell-actions="{ row }">
            <div class="actions">
              <RouterLink class="btn btn-soft btn-sm" to="/custodian/inventory"><Icon name="eye" :size="14" /> View Item</RouterLink>
              <button
                v-if="!row.isRead"
                class="btn btn-outline btn-sm"
                :disabled="markingId === row._id"
                @click="markRead(row)"
              >
                <Icon name="check" :size="14" /> Mark as Read
              </button>
            </div>
          </template>
        </DataTable>

        <Pagination
          :page="pagination.page"
          :limit="pagination.limit"
          :total="pagination.total"
          :pages="pagination.pages"
          @update:page="onPageChange"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.stack-tight { display: grid; gap: 2px; }
</style>
