<script setup>
import { onMounted, ref, watch } from 'vue'
import DataTable from '../../components/DataTable.vue'
import Pagination from '../../components/Pagination.vue'
import Modal from '../../components/Modal.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import Icon from '../../components/Icon.vue'
import { inventoryService } from '../../services'
import { useUiStore } from '../../stores/ui'
import { CATEGORIES, STOCK_STATUSES, UNITS } from '../../utils/constants'
import { formatDate, formatNumber } from '../../utils/format'

const ui = useUiStore()

const columns = [
  { key: 'itemCode', label: 'Item Code', class: 'strong' },
  { key: 'itemName', label: 'Item Name' },
  { key: 'category', label: 'Category' },
  { key: 'unit', label: 'Unit of Measurement' },
  { key: 'quantity', label: 'Quantity on Hand', class: 'num' },
  { key: 'reorderLevel', label: 'Reorder Level', class: 'num' },
  { key: 'status', label: 'Stock Status' },
  { key: 'createdAt', label: 'Date Added' },
  { key: 'actions', label: 'Actions', class: 'actions' },
]

const items = ref([])
const loading = ref(true)
const error = ref('')
const search = ref('')
const category = ref('')
const status = ref('')
const page = ref(1)
const limit = ref(25)
const pagination = ref({ total: 0, page: 1, limit: 25, pages: 1 })

const showModal = ref(false)
const editingId = ref(null)
const originalCode = ref('')
const form = ref(blankForm())
const formError = ref('')
const saving = ref(false)
const checkingCode = ref(false)
const codeAvailable = ref(null)
let searchTimer

function blankForm() {
  return { itemCode: '', itemName: '', category: '', unit: '', quantity: 0, reorderLevel: 0 }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await inventoryService.list({
      search: search.value,
      category: category.value,
      status: status.value,
      page: page.value,
      limit: limit.value,
    })
    items.value = response.data || []
    pagination.value = response.pagination || {
      total: items.value.length,
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
  category.value = ''
  status.value = ''
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

watch([category, status], () => {
  page.value = 1
  load()
})

function openCreate() {
  editingId.value = null
  originalCode.value = ''
  form.value = blankForm()
  formError.value = ''
  codeAvailable.value = null
  showModal.value = true
}

function openEdit(item) {
  editingId.value = item._id
  originalCode.value = item.itemCode || ''
  form.value = {
    itemCode: item.itemCode || '',
    itemName: item.itemName || '',
    category: item.category || '',
    unit: item.unit || '',
    quantity: Number(item.quantity || 0),
    reorderLevel: Number(item.reorderLevel || 0),
  }
  formError.value = ''
  codeAvailable.value = true
  showModal.value = true
}

function closeModal() {
  if (saving.value) return
  showModal.value = false
}

function onCodeInput() {
  codeAvailable.value = null
}

async function checkCode() {
  const code = String(form.value.itemCode || '').trim()
  if (!code) {
    codeAvailable.value = true
    return true
  }
  if (editingId.value && code.toUpperCase() === originalCode.value.toUpperCase()) {
    codeAvailable.value = true
    return true
  }
  checkingCode.value = true
  try {
    const response = await inventoryService.checkCode(code, editingId.value || undefined)
    codeAvailable.value = Boolean(response.data?.available)
    return codeAvailable.value
  } catch (err) {
    codeAvailable.value = null
    ui.notify(err.message, 'error')
    return false
  } finally {
    checkingCode.value = false
  }
}

async function save() {
  formError.value = ''
  const itemName = String(form.value.itemName || '').trim()
  if (!itemName) {
    formError.value = 'Item name is required.'
    return
  }
  if (!form.value.category) {
    formError.value = 'Select a category.'
    return
  }
  if (!form.value.unit) {
    formError.value = 'Select a unit of measurement.'
    return
  }
  const quantity = Number(form.value.quantity)
  const reorderLevel = Number(form.value.reorderLevel)
  if (!Number.isFinite(quantity) || quantity < 0) {
    formError.value = 'Quantity on hand must be zero or greater.'
    return
  }
  if (!Number.isFinite(reorderLevel) || reorderLevel < 0) {
    formError.value = 'Reorder level must be zero or greater.'
    return
  }

  const available = await checkCode()
  if (!available) {
    formError.value = 'This item code is unavailable or could not be verified.'
    return
  }

  saving.value = true
  try {
    const payload = {
      itemCode: String(form.value.itemCode || '').trim(),
      itemName,
      category: form.value.category,
      unit: form.value.unit,
      quantity,
      reorderLevel,
    }
    if (editingId.value) {
      await inventoryService.update(editingId.value, payload)
      ui.notify('Inventory item updated.', 'success')
    } else {
      await inventoryService.create(payload)
      ui.notify('Inventory item added.', 'success')
    }
    showModal.value = false
    await load()
  } catch (err) {
    formError.value = err.message
    ui.notify(err.message, 'error')
  } finally {
    saving.value = false
  }
}

async function archive(item) {
  const confirmed = await ui.confirm({
    title: 'Archive inventory item',
    message: `Archive "${item.itemName}" (${item.itemCode})? It will be removed from active inventory and new requests. Existing records will be preserved.`,
    confirmText: 'Archive item',
    danger: true,
  })
  if (!confirmed) return
  try {
    await inventoryService.archive(item._id)
    ui.notify('Inventory item archived.', 'success')
    await load()
  } catch (err) {
    error.value = err.message
    ui.notify(err.message, 'error')
  }
}

onMounted(load)
</script>

<template>
  <div class="stack">
    <div class="page-header">
      <div>
        <h1>Inventory Management</h1>
        <p>Add, update, and archive school supply items and monitor stock levels.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-outline" :disabled="loading" @click="load"><Icon name="refresh" :size="16" /> Refresh</button>
        <button class="btn btn-primary" @click="openCreate"><Icon name="plus" :size="16" /> Add Item</button>
      </div>
    </div>

    <div v-if="error" class="alert alert-error">
      <Icon name="warning" :size="16" />
      <span>{{ error }}</span>
      <button class="btn btn-sm btn-outline" @click="load">Retry</button>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>Inventory Items</h2>
        <span class="muted small">{{ formatNumber(pagination.total) }} total</span>
      </div>
      <div class="card-body">
        <div class="toolbar">
          <input v-model="search" class="input search" type="search" placeholder="Search item code or name…" aria-label="Search inventory" />
          <select v-model="category" class="select" aria-label="Filter by category">
            <option value="">All categories</option>
            <option v-for="option in CATEGORIES" :key="option" :value="option">{{ option }}</option>
          </select>
          <select v-model="status" class="select" aria-label="Filter by stock status">
            <option value="">All statuses</option>
            <option v-for="option in STOCK_STATUSES" :key="option" :value="option">{{ option }}</option>
          </select>
          <button class="btn btn-outline btn-sm" @click="resetFilters"><Icon name="x" :size="14" /> Clear filters</button>
        </div>

        <DataTable
          :columns="columns"
          :rows="items"
          :loading="loading"
          row-key="_id"
          empty-title="No inventory items"
          empty-message="Add a new item or adjust your search and filters."
        >
          <template #cell-quantity="{ row }">
            <span :class="{ 'low-qty': row.quantity <= row.reorderLevel }">{{ formatNumber(row.quantity) }}</span>
          </template>
          <template #cell-reorderLevel="{ row }">{{ formatNumber(row.reorderLevel) }}</template>
          <template #cell-status="{ row }"><StatusBadge :status="row.status" /></template>
          <template #cell-createdAt="{ row }">{{ formatDate(row.createdAt) }}</template>
          <template #cell-actions="{ row }">
            <div class="actions">
              <button class="btn btn-soft btn-sm" @click="openEdit(row)"><Icon name="edit" :size="14" /> Edit</button>
              <button class="btn btn-danger btn-sm" @click="archive(row)"><Icon name="trash" :size="14" /> Archive</button>
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

    <Modal v-if="showModal" :title="editingId ? 'Edit Inventory Item' : 'Add Inventory Item'" @close="closeModal">
      <div v-if="formError" class="alert alert-error">
        <Icon name="warning" :size="16" />
        <span>{{ formError }}</span>
      </div>
      <div class="form-grid">
        <div class="field">
          <label for="itemCode">Item Code</label>
          <input
            id="itemCode"
            v-model="form.itemCode"
            class="input"
            type="text"
            placeholder="Leave blank to auto-generate"
            @input="onCodeInput"
            @blur="checkCode"
          />
          <span v-if="checkingCode" class="hint">Checking availability…</span>
          <span v-else-if="codeAvailable === true && form.itemCode" class="code-ok">Code available</span>
          <span v-else-if="codeAvailable === false" class="field-error">Code already in use</span>
          <span v-else class="hint">Leave blank to auto-generate</span>
        </div>
        <div class="field">
          <label for="itemName">Item Name</label>
          <input id="itemName" v-model="form.itemName" class="input" type="text" placeholder="e.g. Bond Paper A4" />
        </div>
        <div class="field">
          <label for="category">Category</label>
          <select id="category" v-model="form.category" class="select">
            <option value="" disabled>Select a category</option>
            <option v-for="option in CATEGORIES" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>
        <div class="field">
          <label for="unit">Unit of Measurement</label>
          <select id="unit" v-model="form.unit" class="select">
            <option value="" disabled>Select a unit</option>
            <option v-for="option in UNITS" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>
        <div class="field">
          <label for="quantity">Quantity on Hand</label>
          <input id="quantity" v-model.number="form.quantity" class="input" type="number" min="0" step="1" />
        </div>
        <div class="field">
          <label for="reorderLevel">Reorder Level</label>
          <input id="reorderLevel" v-model.number="form.reorderLevel" class="input" type="number" min="0" step="1" />
        </div>
      </div>
      <template #footer>
        <button class="btn btn-outline" :disabled="saving" @click="closeModal">Cancel</button>
        <button class="btn btn-primary" :disabled="saving || checkingCode" @click="save">
          <span v-if="saving" class="spinner" />
          {{ saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Item' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.low-qty { color: var(--amber); font-weight: 700; }
.code-ok { color: var(--green-700); font-size: 0.75rem; font-weight: 600; }
</style>
