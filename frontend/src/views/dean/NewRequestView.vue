<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import DataTable from '../../components/DataTable.vue'
import EmptyState from '../../components/EmptyState.vue'
import Icon from '../../components/Icon.vue'
import Pagination from '../../components/Pagination.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import { inventoryService, requestService } from '../../services'
import { useUiStore } from '../../stores/ui'
import { CATEGORIES, STOCK_STATUSES } from '../../utils/constants'
import { formatNumber } from '../../utils/format'

const router = useRouter()
const ui = useUiStore()
const options = ref([])
const optionsLoading = ref(true)
const optionsError = ref('')
const search = ref('')
const category = ref('')
const status = ref('')
const optionPage = ref(1)
const optionLimit = ref(8)
const form = ref({ purpose: '', dateNeeded: '' })
const selected = ref([])
const submitting = ref(false)
const submitError = ref('')
const formErrors = ref({})
const quantityErrors = ref({})

function todayInputValue() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

const minDate = todayInputValue()

const optionColumns = [
  { key: 'itemCode', label: 'Code', class: 'strong' },
  { key: 'itemName', label: 'Item' },
  { key: 'category', label: 'Category' },
  { key: 'quantity', label: 'Available', class: 'num' },
  { key: 'status', label: 'Status' },
  { key: 'actions', label: '', class: 'text-right' },
]

const filteredOptions = computed(() => {
  const term = search.value.trim().toLowerCase()
  return options.value.filter((item) => {
    const matchesSearch = !term || [item.itemCode, item.itemName, item.category].some((value) => String(value || '').toLowerCase().includes(term))
    const matchesCategory = !category.value || item.category === category.value
    const matchesStatus = !status.value || item.status === status.value
    return matchesSearch && matchesCategory && matchesStatus
  })
})

const totalOptionPages = computed(() => Math.max(1, Math.ceil(filteredOptions.value.length / optionLimit.value)))
const pagedOptions = computed(() => {
  const start = (optionPage.value - 1) * optionLimit.value
  return filteredOptions.value.slice(start, start + optionLimit.value)
})
const selectedIds = computed(() => new Set(selected.value.map((row) => row.item)))
const totalUnits = computed(() => selected.value.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0))

watch([search, category, status], () => { optionPage.value = 1 })
watch(totalOptionPages, (pages) => {
  if (optionPage.value > pages) optionPage.value = pages
})

async function loadOptions() {
  optionsLoading.value = true
  optionsError.value = ''
  try {
    const response = await inventoryService.options()
    options.value = Array.isArray(response.data) ? response.data : []
  } catch (err) {
    optionsError.value = err.message
    options.value = []
    ui.notify(err.message, 'error')
  } finally {
    optionsLoading.value = false
  }
}

function addItem(item) {
  if (Number(item.quantity) <= 0) {
    ui.notify('Out-of-stock items cannot be requested.', 'error')
    return
  }
  if (selectedIds.value.has(item._id)) {
    ui.notify('This item is already in your request.', 'error')
    return
  }
  selected.value.push({
    item: item._id,
    itemCode: item.itemCode,
    itemName: item.itemName,
    category: item.category,
    unit: item.unit,
    status: item.status,
    available: Number(item.quantity),
    quantity: 1,
  })
}

function removeItem(id) {
  selected.value = selected.value.filter((row) => row.item !== id)
  const nextErrors = { ...quantityErrors.value }
  delete nextErrors[id]
  quantityErrors.value = nextErrors
}

function clearSelection() {
  selected.value = []
  quantityErrors.value = {}
}

function onQuantityInput(id) {
  const nextErrors = { ...quantityErrors.value }
  delete nextErrors[id]
  quantityErrors.value = nextErrors
}

function validate() {
  const errors = {}
  const nextQuantityErrors = {}
  if (!form.value.purpose.trim()) errors.purpose = 'Purpose is required.'
  if (!form.value.dateNeeded) errors.dateNeeded = 'Date needed is required.'
  else if (form.value.dateNeeded < minDate) errors.dateNeeded = 'Date needed cannot be in the past.'
  if (!selected.value.length) errors.items = 'Add at least one item.'
  selected.value.forEach((row) => {
    const quantity = Number(row.quantity)
    if (!Number.isInteger(quantity) || quantity <= 0) nextQuantityErrors[row.item] = 'Enter a positive whole number.'
    else if (quantity > row.available) nextQuantityErrors[row.item] = `Only ${row.available} ${row.unit}(s) available.`
  })
  formErrors.value = errors
  quantityErrors.value = nextQuantityErrors
  return errors
}

async function submit() {
  if (submitting.value) return
  const errors = validate()
  const firstMessage = Object.values(errors)[0] || Object.values(quantityErrors.value)[0]
  if (firstMessage) {
    ui.notify(firstMessage, 'error')
    return
  }
  submitError.value = ''
  submitting.value = true
  try {
    const response = await requestService.create({
      items: selected.value.map((row) => ({ item: row.item, quantity: Number(row.quantity) })),
      purpose: form.value.purpose.trim(),
      dateNeeded: form.value.dateNeeded,
    })
    ui.notify(response?.message || 'Supply request submitted.', 'success')
    router.push('/dean/requests')
  } catch (err) {
    submitError.value = err.message
    ui.notify(err.message, 'error')
  } finally {
    submitting.value = false
  }
}

function resetFilters() {
  search.value = ''
  category.value = ''
  status.value = ''
  optionPage.value = 1
}

onMounted(loadOptions)
</script>

<template>
  <div class="stack">
    <div class="page-header">
      <div>
        <h1>New Supply Request</h1>
        <p>Select available supplies, set quantities, and submit a request for your department.</p>
      </div>
      <RouterLink class="btn btn-outline" to="/dean/requests"><Icon name="clipboard" :size="17" /> My Requests</RouterLink>
    </div>

    <div class="card">
      <div class="card-header"><h2>Request Details</h2><span class="muted small">All fields are required</span></div>
      <div class="card-body">
        <div v-if="submitError" class="alert alert-error">
          <Icon name="warning" :size="17" />
          <span class="strong">{{ submitError }}</span>
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="purpose">Purpose</label>
            <textarea
              id="purpose"
              v-model="form.purpose"
              class="textarea"
              maxlength="500"
              placeholder="Explain why these supplies are needed"
              @input="formErrors.purpose = ''"
            />
            <span v-if="formErrors.purpose" class="field-error">{{ formErrors.purpose }}</span>
          </div>
          <div class="field">
            <label for="date-needed">Date Needed</label>
            <input
              id="date-needed"
              v-model="form.dateNeeded"
              class="input"
              type="date"
              :min="minDate"
              @input="formErrors.dateNeeded = ''"
            />
            <span class="hint">Cannot be earlier than today.</span>
            <span v-if="formErrors.dateNeeded" class="field-error">{{ formErrors.dateNeeded }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <h2>Selected Items</h2>
        <span class="muted small">{{ selected.length }} item(s) &middot; {{ formatNumber(totalUnits) }} unit(s)</span>
      </div>
      <div class="card-body">
        <div v-if="formErrors.items" class="alert alert-error">
          <Icon name="warning" :size="17" />
          <span>{{ formErrors.items }}</span>
        </div>
        <EmptyState
          v-if="!selected.length"
          icon="clipboard"
          title="No items selected"
          message="Add supplies from the catalog below to build your request."
        />
        <template v-else>
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Available</th>
                  <th>Quantity</th>
                  <th class="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in selected" :key="row.item">
                  <td>
                    <strong>{{ row.itemName }}</strong>
                    <div class="muted small">{{ row.itemCode }} &middot; {{ row.unit }}</div>
                  </td>
                  <td class="num">{{ formatNumber(row.available) }} {{ row.unit }}</td>
                  <td>
                    <input
                      v-model.number="row.quantity"
                      class="input quantity-input"
                      type="number"
                      min="1"
                      step="1"
                      :max="row.available"
                      :aria-label="`Quantity for ${row.itemName}`"
                      @input="onQuantityInput(row.item)"
                    />
                    <span v-if="quantityErrors[row.item]" class="field-error">{{ quantityErrors[row.item] }}</span>
                  </td>
                  <td class="text-right">
                    <button class="btn btn-icon danger" :aria-label="`Remove ${row.itemName}`" @click="removeItem(row.item)">
                      <Icon name="trash" :size="16" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
        <div class="form-actions">
          <button class="btn btn-outline" :disabled="!selected.length" @click="clearSelection"><Icon name="x" :size="16" /> Clear selection</button>
          <button class="btn btn-primary" :disabled="submitting" @click="submit">
            <span v-if="submitting" class="spinner" />
            <Icon v-else name="send" :size="16" />
            {{ submitting ? 'Submitting…' : 'Submit Request' }}
          </button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><h2>Available Supplies</h2><span class="muted small">Active inventory items</span></div>
      <div class="card-body">
        <div class="toolbar">
          <input
            v-model="search"
            class="input search"
            type="search"
            placeholder="Search item code or name"
            @keyup.enter="optionPage = 1"
          />
          <select v-model="category" class="select" @change="optionPage = 1">
            <option value="">All categories</option>
            <option v-for="option in CATEGORIES" :key="option" :value="option">{{ option }}</option>
          </select>
          <select v-model="status" class="select" @change="optionPage = 1">
            <option value="">All statuses</option>
            <option v-for="option in STOCK_STATUSES" :key="option" :value="option">{{ option }}</option>
          </select>
          <button class="btn btn-primary" @click="optionPage = 1"><Icon name="search" :size="16" /> Search</button>
          <button class="btn btn-outline" @click="resetFilters"><Icon name="refresh" :size="16" /> Reset</button>
        </div>

        <div v-if="optionsError" class="alert alert-error">
          <Icon name="warning" :size="17" />
          <span class="strong">{{ optionsError }}</span>
          <button class="btn btn-sm btn-outline" @click="loadOptions">Retry</button>
        </div>

        <DataTable
          :columns="optionColumns"
          :rows="pagedOptions"
          :loading="optionsLoading"
          empty-title="No available supplies"
          empty-message="Try a different search or clear the filters."
        >
          <template #cell-quantity="{ row, value }">
            <span :class="{ 'low-stock': row.reorderLevel != null && Number(value) <= Number(row.reorderLevel) }">
              {{ formatNumber(value) }} {{ row.unit }}
            </span>
          </template>
          <template #cell-status="{ value }">
            <StatusBadge :status="value" />
          </template>
          <template #cell-actions="{ row }">
            <div class="actions">
              <button v-if="selectedIds.has(row._id)" class="btn btn-soft btn-sm" disabled>Added</button>
              <button
                v-else
                class="btn btn-primary btn-sm"
                :disabled="Number(row.quantity) <= 0"
                :title="Number(row.quantity) <= 0 ? 'Out of stock' : 'Add to request'"
                @click="addItem(row)"
              >
                <Icon name="plus" :size="15" /> Add
              </button>
            </div>
          </template>
        </DataTable>

        <Pagination
          :page="optionPage"
          :limit="optionLimit"
          :total="filteredOptions.length"
          :pages="totalOptionPages"
          @update:page="optionPage = $event"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.quantity-input { max-width: 110px; min-height: 34px; }
.low-stock { color: var(--amber); font-weight: 700; }
.alert .strong { flex: 1; }
@media (max-width: 640px) {
  .toolbar .input, .toolbar .select { width: 100%; }
  .toolbar .search { max-width: none; }
}
</style>
