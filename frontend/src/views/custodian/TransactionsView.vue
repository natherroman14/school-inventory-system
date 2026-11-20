<script setup>
import { onMounted, ref, watch } from 'vue'
import DataTable from '../../components/DataTable.vue'
import Pagination from '../../components/Pagination.vue'
import Modal from '../../components/Modal.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import Icon from '../../components/Icon.vue'
import { inventoryService, transactionService, userService } from '../../services'
import { useUiStore } from '../../stores/ui'
import { CATEGORIES } from '../../utils/constants'
import { formatDateTime, formatNumber, humanize } from '../../utils/format'

const ui = useUiStore()

const columns = [
  { key: 'transactionId', label: 'Transaction ID', class: 'strong' },
  { key: 'createdAt', label: 'Date' },
  { key: 'item', label: 'Item' },
  { key: 'transactionType', label: 'Type' },
  { key: 'quantity', label: 'Quantity', class: 'num' },
  { key: 'previousQuantity', label: 'Previous', class: 'num' },
  { key: 'newQuantity', label: 'New', class: 'num' },
  { key: 'performedBy', label: 'Responsible User' },
  { key: 'relatedRequest', label: 'Related Request' },
]

const rows = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const transactionType = ref('')
const startDate = ref('')
const endDate = ref('')
const category = ref('')
const department = ref('')
const page = ref(1)
const limit = ref(25)
const pagination = ref({ total: 0, page: 1, limit: 25, pages: 1 })
const departments = ref([])
const itemOptions = ref([])

const showModal = ref(false)
const stockForm = ref(blankStockForm())
const formError = ref('')
const saving = ref(false)
let searchTimer

function blankStockForm() {
  return { itemId: '', quantity: 1, note: '' }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await transactionService.list({
      search: search.value,
      transactionType: transactionType.value,
      startDate: startDate.value,
      endDate: endDate.value,
      category: category.value,
      department: department.value,
      page: page.value,
      limit: limit.value,
    })
    rows.value = response.data || []
    pagination.value = response.pagination || {
      total: rows.value.length,
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

async function loadDepartments() {
  try {
    const response = await userService.departments()
    departments.value = response.data || []
  } catch (err) {
    ui.notify(err.message, 'error')
  }
}

async function loadOptions() {
  try {
    const response = await inventoryService.options()
    itemOptions.value = response.data || []
  } catch (err) {
    ui.notify(err.message, 'error')
  }
}

function resetFilters() {
  search.value = ''
  transactionType.value = ''
  startDate.value = ''
  endDate.value = ''
  category.value = ''
  department.value = ''
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

watch([transactionType, startDate, endDate, category, department], () => {
  page.value = 1
  load()
})

function openStockIn() {
  stockForm.value = blankStockForm()
  formError.value = ''
  showModal.value = true
}

function closeModal() {
  if (saving.value) return
  showModal.value = false
}

async function saveStockIn() {
  formError.value = ''
  if (!stockForm.value.itemId) {
    formError.value = 'Select an item to stock in.'
    return
  }
  const quantity = Number(stockForm.value.quantity)
  if (!Number.isInteger(quantity) || quantity <= 0) {
    formError.value = 'Quantity must be a positive whole number.'
    return
  }
  saving.value = true
  try {
    await transactionService.stockIn({
      itemId: stockForm.value.itemId,
      quantity,
      note: String(stockForm.value.note || '').trim(),
    })
    ui.notify('Stock-in recorded.', 'success')
    showModal.value = false
    await Promise.all([load(), loadOptions()])
  } catch (err) {
    formError.value = err.message
    ui.notify(err.message, 'error')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  load()
  loadDepartments()
  loadOptions()
})
</script>

<template>
  <div class="stack">
    <div class="page-header">
      <div>
        <h1>Stock Transactions</h1>
        <p>Record stock-in movements and review the full transaction history.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" :disabled="loading" @click="load"><Icon name="refresh" :size="16" /> Refresh</button>
        <button class="btn btn-primary" @click="openStockIn"><Icon name="arrowUp" :size="16" /> Record Stock-In</button>
      </div>
    </div>

    <div v-if="error" class="alert alert-error">
      <Icon name="warning" :size="16" />
      <span>{{ error }}</span>
      <button class="btn btn-sm btn-outline" @click="load">Retry</button>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>Transaction History</h2>
        <span class="muted small">{{ formatNumber(pagination.total) }} records</span>
      </div>
      <div class="card-body">
        <div class="toolbar">
          <input v-model="search" class="input search" type="search" placeholder="Search transaction ID…" aria-label="Search transactions" />
          <select v-model="transactionType" class="select" aria-label="Filter by type">
            <option value="">All types</option>
            <option value="STOCK_IN">Stock In</option>
            <option value="STOCK_OUT">Stock Out</option>
          </select>
          <select v-model="category" class="select" aria-label="Filter by category">
            <option value="">All categories</option>
            <option v-for="option in CATEGORIES" :key="option" :value="option">{{ option }}</option>
          </select>
          <select v-model="department" class="select" aria-label="Filter by department">
            <option value="">All departments</option>
            <option v-for="option in departments" :key="option" :value="option">{{ option }}</option>
          </select>
          <input v-model="startDate" class="input" type="date" aria-label="Start date" />
          <input v-model="endDate" class="input" type="date" aria-label="End date" />
          <button class="btn btn-outline btn-sm" @click="resetFilters"><Icon name="x" :size="14" /> Clear filters</button>
        </div>

        <DataTable
          :columns="columns"
          :rows="rows"
          :loading="loading"
          row-key="transactionId"
          empty-title="No transactions found"
          empty-message="Record a stock-in or adjust your search and filters."
        >
          <template #cell-createdAt="{ row }">{{ formatDateTime(row.createdAt) }}</template>
          <template #cell-item="{ row }">
            <div class="stack-tight">
              <strong>{{ row.item?.itemName || 'Archived item' }}</strong>
              <span class="muted small">{{ row.item?.itemCode || '—' }} · {{ row.item?.unit || '—' }}</span>
            </div>
          </template>
          <template #cell-transactionType="{ row }">
            <StatusBadge :status="row.transactionType" :label="humanize(row.transactionType)" />
          </template>
          <template #cell-quantity="{ row }">
            <span :class="row.transactionType === 'STOCK_IN' ? 'qty-in' : 'qty-out'">
              {{ row.transactionType === 'STOCK_IN' ? '+' : '−' }}{{ formatNumber(row.quantity) }}
            </span>
          </template>
          <template #cell-performedBy="{ row }">{{ row.performedBy?.fullName || 'System' }}</template>
          <template #cell-relatedRequest="{ row }">{{ row.relatedRequest?.requestNumber || '—' }}</template>
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

    <Modal v-if="showModal" title="Record Stock-In" @close="closeModal">
      <div v-if="formError" class="alert alert-error">
        <Icon name="warning" :size="16" />
        <span>{{ formError }}</span>
      </div>
      <div class="alert alert-info">
        <Icon name="info" :size="16" />
        <span>Stock-in increases the on-hand quantity of the selected item immediately.</span>
      </div>
      <div class="form-grid">
        <div class="field full">
          <label for="stockItem">Item</label>
          <select id="stockItem" v-model="stockForm.itemId" class="select">
            <option value="" disabled>Select an item</option>
            <option v-for="option in itemOptions" :key="option._id" :value="option._id">
              {{ option.itemCode }} — {{ option.itemName }} ({{ option.unit }})
            </option>
          </select>
          <span v-if="!itemOptions.length" class="hint">No active items are available.</span>
        </div>
        <div class="field">
          <label for="stockQuantity">Quantity Received</label>
          <input id="stockQuantity" v-model.number="stockForm.quantity" class="input" type="number" min="1" step="1" />
        </div>
        <div class="field full">
          <label for="stockNote">Note (optional)</label>
          <textarea id="stockNote" v-model="stockForm.note" class="textarea" placeholder="e.g. Delivered by supplier" />
        </div>
      </div>
      <template #footer>
        <button class="btn btn-outline" :disabled="saving" @click="closeModal">Cancel</button>
        <button class="btn btn-primary" :disabled="saving" @click="saveStockIn">
          <span v-if="saving" class="spinner" />
          {{ saving ? 'Recording…' : 'Record Stock-In' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.stack-tight { display: grid; gap: 2px; }
.full { grid-column: 1 / -1; }
.qty-in { color: var(--green-700); font-weight: 700; }
.qty-out { color: var(--blue); font-weight: 700; }
</style>
