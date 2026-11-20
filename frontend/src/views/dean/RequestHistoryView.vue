<script setup>
import { computed, onMounted, ref } from 'vue'
import DataTable from '../../components/DataTable.vue'
import EmptyState from '../../components/EmptyState.vue'
import Icon from '../../components/Icon.vue'
import Modal from '../../components/Modal.vue'
import Pagination from '../../components/Pagination.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import { requestService } from '../../services'
import { useUiStore } from '../../stores/ui'
import { REQUEST_STATUSES } from '../../utils/constants'
import { formatDate, formatDateTime, formatNumber } from '../../utils/format'

const ui = useUiStore()
const rows = ref([])
const loading = ref(true)
const error = ref('')
const filters = ref({ search: '', status: '', startDate: '', endDate: '' })
const page = ref(1)
const limit = ref(10)
const pagination = ref({ total: 0, page: 1, limit: 10, pages: 1 })
const detailOpen = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detail = ref(null)
const activeRequestId = ref(null)

const columns = [
  { key: 'requestNumber', label: 'Request No.', class: 'strong' },
  { key: 'items', label: 'Items' },
  { key: 'purpose', label: 'Purpose' },
  { key: 'dateNeeded', label: 'Date Needed' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Submitted' },
  { key: 'actions', label: '', class: 'text-right' },
]

const sortedRows = computed(() => [...rows.value].sort((a, b) => {
  const first = new Date(a.createdAt).getTime() || 0
  const second = new Date(b.createdAt).getTime() || 0
  return second - first
}))

const timeline = computed(() => {
  const request = detail.value
  if (!request) return []
  const events = []
  if (request.createdAt) {
    events.push({
      key: 'submitted',
      label: 'Request submitted',
      at: request.createdAt,
      status: 'PENDING',
      note: request.requestedBy?.fullName ? `by ${request.requestedBy.fullName}` : '',
    })
  }
  if (request.approvedAt || ['APPROVED', 'FULFILLED', 'REJECTED'].includes(request.status)) {
    events.push({
      key: 'reviewed',
      label: request.status === 'REJECTED' ? 'Request rejected' : 'Request approved',
      at: request.approvedAt || request.updatedAt,
      status: request.status,
      note: request.approvedBy?.fullName ? `by ${request.approvedBy.fullName}` : '',
    })
  }
  if (request.fulfilledAt || request.status === 'FULFILLED') {
    events.push({
      key: 'fulfilled',
      label: 'Supplies issued',
      at: request.fulfilledAt || request.updatedAt,
      status: 'FULFILLED',
      note: request.fulfilledBy?.fullName ? `by ${request.fulfilledBy.fullName}` : '',
    })
  }
  return events
})

async function load(targetPage = page.value) {
  loading.value = true
  error.value = ''
  try {
    const response = await requestService.list({
      search: filters.value.search,
      status: filters.value.status,
      startDate: filters.value.startDate,
      endDate: filters.value.endDate,
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

async function loadDetail(id) {
  detailLoading.value = true
  detailError.value = ''
  detail.value = null
  try {
    const response = await requestService.get(id)
    detail.value = response.data
  } catch (err) {
    detailError.value = err.message
    ui.notify(err.message, 'error')
  } finally {
    detailLoading.value = false
  }
}

function viewDetails(row) {
  activeRequestId.value = row._id
  detailOpen.value = true
  loadDetail(row._id)
}

function closeDetails() {
  detailOpen.value = false
  detail.value = null
  detailError.value = ''
  activeRequestId.value = null
}

function applyFilters() {
  if (filters.value.startDate && filters.value.endDate && filters.value.startDate > filters.value.endDate) {
    ui.notify('Start date cannot be after end date.', 'error')
    return
  }
  page.value = 1
  load(1)
}

function resetFilters() {
  filters.value = { search: '', status: '', startDate: '', endDate: '' }
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
    <div class="archive-banner card card-pad">
      <div class="row">
        <div class="row-icon"><Icon name="history" :size="22" /></div>
        <div>
          <p class="muted small" style="margin-bottom: 4px">Read-only archive</p>
          <h1 style="margin-bottom: 4px">Request History</h1>
          <p class="muted" style="margin: 0">Review past supply requests and filter records by submission date.</p>
        </div>
      </div>
      <RouterLink class="btn btn-outline" to="/dean/requests"><Icon name="chevronLeft" :size="16" /> Back to My Requests</RouterLink>
    </div>

    <div class="card">
      <div class="card-body">
        <div class="toolbar">
          <input
            v-model="filters.search"
            class="input search"
            type="search"
            placeholder="Search request no. or purpose"
            @keyup.enter="applyFilters"
          />
          <select v-model="filters.status" class="select" @change="applyFilters">
            <option value="">All statuses</option>
            <option v-for="status in REQUEST_STATUSES" :key="status" :value="status">{{ status }}</option>
          </select>
          <input v-model="filters.startDate" class="input" type="date" aria-label="From date" @change="applyFilters" />
          <input v-model="filters.endDate" class="input" type="date" aria-label="To date" @change="applyFilters" />
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
          :rows="sortedRows"
          :loading="loading"
          empty-title="No archived requests"
          empty-message="Try a different date range or clear the filters."
        >
          <template #cell-items="{ value }">
            <span class="num">{{ Array.isArray(value) ? value.length : 0 }} item(s)</span>
          </template>
          <template #cell-purpose="{ value }">
            <span class="truncate" :title="value">{{ value }}</span>
          </template>
          <template #cell-dateNeeded="{ value }">
            <span>{{ formatDate(value) }}</span>
          </template>
          <template #cell-status="{ value }">
            <StatusBadge :status="value" />
          </template>
          <template #cell-createdAt="{ value }">
            <span>{{ formatDate(value) }}</span>
          </template>
          <template #cell-actions="{ row }">
            <div class="actions">
              <button class="btn btn-outline btn-sm" @click="viewDetails(row)"><Icon name="eye" :size="15" /> View</button>
            </div>
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

    <Modal v-if="detailOpen" title="Archived Request Details" wide @close="closeDetails">
      <div v-if="detailLoading" class="loading-block"><span class="spinner spinner-dark" /> Loading details…</div>
      <div v-else-if="detailError" class="alert alert-error">
        <Icon name="warning" :size="17" />
        <span class="strong">{{ detailError }}</span>
        <button class="btn btn-sm btn-outline" @click="loadDetail(activeRequestId)">Retry</button>
      </div>
      <template v-else-if="detail">
        <div class="detail-list">
          <div class="detail-item"><span>Request No.</span><strong>{{ detail.requestNumber }}</strong></div>
          <div class="detail-item"><span>Status</span><strong><StatusBadge :status="detail.status" /></strong></div>
          <div class="detail-item"><span>Department</span><strong>{{ detail.department || '—' }}</strong></div>
          <div class="detail-item"><span>Requested By</span><strong>{{ detail.requestedBy?.fullName || '—' }}</strong></div>
          <div class="detail-item"><span>Date Needed</span><strong>{{ formatDate(detail.dateNeeded) }}</strong></div>
          <div class="detail-item"><span>Submitted</span><strong>{{ formatDateTime(detail.createdAt) }}</strong></div>
          <div v-if="detail.approvedAt" class="detail-item"><span>Reviewed</span><strong>{{ formatDateTime(detail.approvedAt) }}</strong></div>
          <div v-if="detail.fulfilledAt" class="detail-item"><span>Issued</span><strong>{{ formatDateTime(detail.fulfilledAt) }}</strong></div>
          <div v-if="detail.approvedBy" class="detail-item"><span>Approved By</span><strong>{{ detail.approvedBy.fullName }}</strong></div>
          <div v-if="detail.fulfilledBy" class="detail-item"><span>Issued By</span><strong>{{ detail.fulfilledBy.fullName }}</strong></div>
        </div>

        <div class="divider" />
        <div class="detail-block">
          <span class="block-label">Purpose</span>
          <p>{{ detail.purpose || '—' }}</p>
        </div>
        <div class="detail-block">
          <span class="block-label">Remarks</span>
          <p>{{ detail.remarks || '—' }}</p>
        </div>

        <div class="divider" />
        <h3>Requested Items</h3>
        <div v-if="detail.items?.length" class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Item</th>
                <th class="num">Quantity</th>
                <th class="num">Available at Request</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="line in detail.items" :key="line.item || line.itemCode">
                <td class="strong">{{ line.itemCode }}</td>
                <td>{{ line.itemName }}</td>
                <td class="num">{{ formatNumber(line.quantity) }} {{ line.unit }}</td>
                <td class="num">{{ formatNumber(line.availableAtRequest) }} {{ line.unit }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState v-else icon="package" title="No items recorded" message="This request has no item details." />

        <div class="divider" />
        <h3>Status Timeline</h3>
        <ul v-if="timeline.length" class="timeline">
          <li v-for="event in timeline" :key="event.key">
            <div class="timeline-marker"><StatusBadge :status="event.status" /></div>
            <div>
              <strong>{{ event.label }}</strong>
              <div class="muted small">
                {{ formatDateTime(event.at) }}<span v-if="event.note"> &middot; {{ event.note }}</span>
              </div>
            </div>
          </li>
        </ul>
        <EmptyState v-else icon="history" title="No timeline available" message="Status updates will appear here." />
      </template>
      <template #footer><button class="btn btn-outline" @click="closeDetails">Close</button></template>
    </Modal>
  </div>
</template>

<style scoped>
.archive-banner { display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap; background: linear-gradient(100deg, var(--green-950), var(--green-700)); color: #fff; border-color: transparent; }
.archive-banner .muted { color: #cfe6d7; }
.archive-banner .row-icon { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; background: rgba(255, 255, 255, 0.12); color: #fff; flex-shrink: 0; }
.archive-banner :deep(.btn-outline) { background: rgba(255, 255, 255, 0.08); color: #fff; border-color: rgba(255, 255, 255, 0.45); }
.archive-banner :deep(.btn-outline:hover) { background: rgba(255, 255, 255, 0.18); color: #fff; border-color: #fff; }
.detail-block { margin-bottom: 12px; }
.detail-block p { margin: 4px 0 0; font-size: 0.88rem; white-space: pre-line; }
.block-label { font-size: 0.73rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; }
.alert .strong { flex: 1; }
.timeline { list-style: none; margin: 0; padding: 0; display: grid; gap: 14px; }
.timeline li { display: flex; align-items: flex-start; gap: 12px; }
.timeline-marker { min-width: 96px; }
@media (max-width: 640px) {
  .toolbar .input, .toolbar .select { width: 100%; }
  .toolbar .search { max-width: none; }
  .timeline li { flex-direction: column; gap: 6px; }
}
</style>
