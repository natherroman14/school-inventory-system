<script setup>
import { onMounted, ref } from 'vue'
import DataTable from '../../components/DataTable.vue'
import Icon from '../../components/Icon.vue'
import Pagination from '../../components/Pagination.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import { inventoryService } from '../../services'
import { useUiStore } from '../../stores/ui'
import { CATEGORIES, STOCK_STATUSES } from '../../utils/constants'
import { formatDate, formatNumber } from '../../utils/format'

const ui = useUiStore()
const rows = ref([])
const loading = ref(true)
const error = ref('')
const filters = ref({ search: '', category: '', status: '' })
const page = ref(1)
const limit = ref(10)
const pagination = ref({ total: 0, page: 1, limit: 10, pages: 1 })

const columns = [
  { key: 'itemCode', label: 'Item Code', class: 'strong' },
  { key: 'itemName', label: 'Item Name' },
  { key: 'category', label: 'Category' },
  { key: 'unit', label: 'Unit' },
  { key: 'quantity', label: 'Available', class: 'num' },
  { key: 'reorderLevel', label: 'Reorder Level', class: 'num' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Added On' },
]

async function load(targetPage = page.value) {
  loading.value = true
  error.value = ''
  try {
    const response = await inventoryService.list({
      search: filters.value.search,
      category: filters.value.category,
      status: filters.value.status,
      page: targetPage,
      limit: limit.value,
    })
    const meta = response.pagination || {}
    const resolvedPage = Number(meta.page || targetPage)
    if (meta.pages && resolvedPage > Number(meta.pages)) {
      page.value = Number(meta.pages)
      await load(page.value)
      return
    }
    page.value = resolvedPage
    rows.value = Array.isArray(response.data) ? response.data : []
    pagination.value = {
      total: Number(meta.total ?? rows.value.length),
      page: resolvedPage,
      limit: Number(meta.limit || limit.value),
      pages: Number(meta.pages || 1),
    }
  } catch (err) {
    error.value = err.message
    rows.value = []
    ui.notify(err.message, 'error')
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  page.value = 1
  load(1)
}

function resetFilters() {
  filters.value = { search: '', category: '', status: '' }
  applyFilters()
}

function changePage(nextPage) {
  page.value = nextPage
  load(nextPage)
}

function changeLimit() {
  page.value = 1
  load(1)
}

onMounted(() => load())
</script>

<template>
  <div class="stack">
    <div class="page-header">
      <div>
        <h1>Browse Inventory</h1>
        <p>Check available supplies and current stock levels before submitting a request.</p>
      </div>
    </div>

    <div class="alert alert-info">
      <Icon name="lock" :size="17" />
      <span>This catalog is read-only. Contact the property custodian if you need stock details corrected.</span>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="toolbar">
          <input
            v-model="filters.search"
            class="input search"
            type="search"
            placeholder="Search item code or name"
            @keyup.enter="applyFilters"
          />
          <select v-model="filters.category" class="select" @change="applyFilters">
            <option value="">All categories</option>
            <option v-for="category in CATEGORIES" :key="category" :value="category">{{ category }}</option>
          </select>
          <select v-model="filters.status" class="select" @change="applyFilters">
            <option value="">All statuses</option>
            <option v-for="status in STOCK_STATUSES" :key="status" :value="status">{{ status }}</option>
          </select>
          <select v-model.number="limit" class="select" aria-label="Rows per page" @change="changeLimit">
            <option :value="10">10 per page</option>
            <option :value="25">25 per page</option>
            <option :value="50">50 per page</option>
          </select>
          <button class="btn btn-primary" @click="applyFilters"><Icon name="search" :size="16" /> Search</button>
          <button class="btn btn-outline" @click="resetFilters"><Icon name="refresh" :size="16" /> Reset</button>
        </div>

        <div v-if="error" class="alert alert-error">
          <Icon name="warning" :size="17" />
          <span class="strong">{{ error }}</span>
          <button class="btn btn-sm btn-outline" @click="load(page)">Retry</button>
        </div>

        <DataTable
          :columns="columns"
          :rows="rows"
          :loading="loading"
          empty-title="No inventory items found"
          empty-message="Try a different search term or clear the filters."
        >
          <template #cell-quantity="{ row, value }">
            <span :class="{ 'low-stock': row.reorderLevel != null && Number(value) <= Number(row.reorderLevel) }">
              {{ formatNumber(value) }} {{ row.unit }}
            </span>
          </template>
          <template #cell-reorderLevel="{ value }">
            <span class="num">{{ formatNumber(value) }}</span>
          </template>
          <template #cell-status="{ value }">
            <StatusBadge :status="value" />
          </template>
          <template #cell-createdAt="{ value }">
            <span>{{ formatDate(value) }}</span>
          </template>
        </DataTable>

        <Pagination
          :page="pagination.page"
          :limit="pagination.limit"
          :total="pagination.total"
          :pages="pagination.pages"
          @update:page="changePage"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.low-stock { color: var(--amber); font-weight: 700; }
.alert .strong { flex: 1; }
@media (max-width: 640px) {
  .toolbar .input, .toolbar .select { width: 100%; }
  .toolbar .search { max-width: none; }
}
</style>
