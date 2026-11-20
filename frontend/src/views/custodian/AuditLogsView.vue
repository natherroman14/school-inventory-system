<script setup>
import { onMounted, ref, watch } from 'vue'
import DataTable from '../../components/DataTable.vue'
import Pagination from '../../components/Pagination.vue'
import Icon from '../../components/Icon.vue'
import { auditService } from '../../services'
import { useUiStore } from '../../stores/ui'
import { formatDateTime, formatNumber, humanize } from '../../utils/format'

const ui = useUiStore()

const AUDIT_ACTIONS = [
  'USER_LOGIN',
  'USER_LOGOUT',
  'INVENTORY_ITEM_CREATED',
  'INVENTORY_ITEM_UPDATED',
  'INVENTORY_ITEM_ARCHIVED',
  'STOCK_IN',
  'STOCK_OUT',
  'SUPPLY_REQUEST_SUBMITTED',
  'SUPPLY_REQUEST_APPROVED',
  'SUPPLY_REQUEST_REJECTED',
  'SUPPLY_REQUEST_FULFILLED',
  'USER_ACCOUNT_CREATED',
  'USER_ACCOUNT_UPDATED',
  'USER_ACCOUNT_DEACTIVATED',
  'USER_PASSWORD_RESET',
]

const columns = [
  { key: 'timestamp', label: 'Timestamp' },
  { key: 'user', label: 'User' },
  { key: 'action', label: 'Action' },
  { key: 'description', label: 'Description' },
  { key: 'ip', label: 'IP Address' },
]

const logs = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const action = ref('')
const startDate = ref('')
const endDate = ref('')
const page = ref(1)
const limit = ref(25)
const pagination = ref({ total: 0, page: 1, limit: 25, pages: 1 })
let searchTimer

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await auditService.list({
      search: search.value,
      action: action.value,
      startDate: startDate.value,
      endDate: endDate.value,
      page: page.value,
      limit: limit.value,
    })
    logs.value = response.data || []
    pagination.value = response.pagination || {
      total: logs.value.length,
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

function resetFilters() {
  search.value = ''
  action.value = ''
  startDate.value = ''
  endDate.value = ''
  page.value = 1
  load()
}

function onPageChange(value) {
  page.value = value
  load()
}

watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
})

watch([action, startDate, endDate], () => {
  page.value = 1
  load()
})

onMounted(load)
</script>

<template>
  <div class="stack">
    <div class="page-header">
      <div>
        <h1>Audit Logs</h1>
        <p>Immutable record of significant system actions and user activity.</p>
      </div>
      <div class="page-actions">
        <span class="badge badge-gray"><Icon name="lock" :size="12" /> Read-only</span>
        <button class="btn btn-outline" :disabled="loading" @click="load"><Icon name="refresh" :size="16" /> Refresh</button>
      </div>
    </div>

    <div class="alert alert-info">
      <Icon name="info" :size="16" />
      <span>These logs are immutable. Records are generated automatically and cannot be edited, archived, or deleted.</span>
    </div>

    <div v-if="error" class="alert alert-error">
      <Icon name="warning" :size="16" />
      <span>{{ error }}</span>
      <button class="btn btn-sm btn-outline" @click="load">Retry</button>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>System Activity</h2>
        <span class="muted small">{{ formatNumber(pagination.total) }} entries</span>
      </div>
      <div class="card-body">
        <div class="toolbar">
          <input v-model="search" class="input search" type="search" placeholder="Search description…" aria-label="Search audit logs" />
          <select v-model="action" class="select" aria-label="Filter by action">
            <option value="">All actions</option>
            <option v-for="option in AUDIT_ACTIONS" :key="option" :value="option">{{ humanize(option) }}</option>
          </select>
          <input v-model="startDate" class="input" type="date" aria-label="Start date" />
          <input v-model="endDate" class="input" type="date" aria-label="End date" />
          <button class="btn btn-outline btn-sm" @click="resetFilters"><Icon name="x" :size="14" /> Clear filters</button>
        </div>

        <DataTable
          :columns="columns"
          :rows="logs"
          :loading="loading"
          row-key="_id"
          empty-title="No audit entries"
          empty-message="No activity matches the current search, action, or date range."
        >
          <template #cell-timestamp="{ row }">{{ formatDateTime(row.timestamp) }}</template>
          <template #cell-user="{ row }">
            <div class="stack-tight">
              <strong>{{ row.user?.fullName || 'System' }}</strong>
              <span class="muted small">@{{ row.user?.username || 'system' }} · {{ humanize(row.user?.role || '') }}</span>
            </div>
          </template>
          <template #cell-action="{ row }"><span class="badge badge-gray">{{ humanize(row.action) }}</span></template>
          <template #cell-description="{ row }"><span class="truncate">{{ row.description }}</span></template>
          <template #cell-ip="{ row }"><span class="small muted">{{ row.ip || '—' }}</span></template>
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
