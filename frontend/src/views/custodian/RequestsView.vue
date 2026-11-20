<script setup>
import { computed, onMounted, ref } from 'vue'
import DataTable from '../../components/DataTable.vue'
import Pagination from '../../components/Pagination.vue'
import Modal from '../../components/Modal.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import Icon from '../../components/Icon.vue'
import EmptyState from '../../components/EmptyState.vue'
import { requestService, userService } from '../../services'
import { useUiStore } from '../../stores/ui'
import { REQUEST_STATUSES } from '../../utils/constants'
import { formatDate, formatNumber, humanize } from '../../utils/format'

const ui = useUiStore()
const rows = ref([])
const pagination = ref({ total: 0, page: 1, limit: 25, pages: 1 })
const loading = ref(true)
const error = ref('')
const departments = ref([])
const filters = ref({ search: '', status: '', department: '', startDate: '', endDate: '' })

const detailsModal = ref(false)
const details = ref(null)
const detailsLoading = ref(false)
const detailsError = ref('')
const approvalRemarks = ref('')
const actionBusy = ref(false)

const rejectModal = ref(false)
const rejectTarget = ref(null)
const rejectRemarks = ref('')
const rejectError = ref('')

const columns = [
  { key: 'requestNumber', label: 'Request No.' },
  { key: 'requestedBy', label: 'Requested By' },
  { key: 'department', label: 'Department' },
  { key: 'purpose', label: 'Purpose' },
  { key: 'dateNeeded', label: 'Date Needed' },
  { key: 'status', label: 'Status' },
  { key: 'createdAt', label: 'Submitted' },
  { key: 'actions', label: 'Actions', class: 'text-right' },
]

const hasInsufficient = computed(() => (details.value?.items || []).some((item) => projected(item) < 0))

let searchTimer = null

function showError(err, target = error) {
  target.value = err.message || 'Unable to complete the request'
  ui.notify(target.value, 'error')
}

function toOptions(payload) {
  const source = payload?.data || payload || {}
  const list = Array.isArray(source) ? source : (source.departments || [])
  return list.map((entry) => {
    if (typeof entry === 'string') return { value: entry, label: entry }
    const value = entry.department ?? entry.name ?? entry.value ?? entry._id
    return { value, label: entry.label ?? entry.name ?? entry.department ?? value }
  }).filter((option) => option.value)
}

async function loadDepartments() {
  try {
    const response = await userService.departments()
    departments.value = toOptions(response)
  } catch (err) {
    showError(err)
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = await requestService.list({ ...filters.value, page: pagination.value.page, limit: pagination.value.limit })
    rows.value = response.data || []
    if (response.pagination) pagination.value = response.pagination
  } catch (err) {
    rows.value = []
    showError(err)
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  pagination.value.page = 1
  load()
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(applyFilters, 300)
}

function resetFilters() {
  filters.value = { search: '', status: '', department: '', startDate: '', endDate: '' }
  applyFilters()
}

function goToPage(page) {
  pagination.value.page = page
  load()
}

function projected(item) {
  return Number(item.availableAtRequest || 0) - Number(item.quantity || 0)
}

async function openDetails(row) {
  detailsModal.value = true
  details.value = null
  detailsError.value = ''
  approvalRemarks.value = ''
  detailsLoading.value = true
  try {
    const response = await requestService.get(row._id)
    details.value = response.data
  } catch (err) {
    showError(err, detailsError)
  } finally {
    detailsLoading.value = false
  }
}

function closeDetails() {
  if (actionBusy.value) return
  detailsModal.value = false
}

async function approveRequest() {
  if (!details.value || actionBusy.value) return
  const accepted = await ui.confirm({
    title: 'Approve request',
    message: `Approve ${details.value.requestNumber} for ${details.value.requestedBy?.fullName || 'this requester'}?`,
    confirmText: 'Approve',
  })
  if (!accepted) return
  actionBusy.value = true
  try {
    await requestService.approve(details.value._id, approvalRemarks.value.trim())
    ui.notify('Request approved')
    detailsModal.value = false
    await load()
  } catch (err) {
    showError(err, detailsError)
  } finally {
    actionBusy.value = false
  }
}

async function fulfillRequest() {
  if (!details.value || actionBusy.value) return
  const warning = hasInsufficient.value ? ' Some items did not have enough stock when requested.' : ''
  const accepted = await ui.confirm({
    title: 'Fulfill request',
    message: `Mark ${details.value.requestNumber} as fulfilled and deduct stock?${warning}`,
    confirmText: 'Fulfill',
  })
  if (!accepted) return
  actionBusy.value = true
  try {
    await requestService.fulfill(details.value._id)
    ui.notify('Request fulfilled')
    detailsModal.value = false
    await load()
  } catch (err) {
    showError(err, detailsError)
  } finally {
    actionBusy.value = false
  }
}

function openReject() {
  rejectTarget.value = details.value
  rejectRemarks.value = ''
  rejectError.value = ''
  detailsModal.value = false
  rejectModal.value = true
}

function closeReject() {
  if (actionBusy.value) return
  rejectModal.value = false
}

async function submitReject() {
  if (!rejectTarget.value || actionBusy.value) return
  const remarks = rejectRemarks.value.trim()
  if (!remarks) {
    rejectError.value = 'Remarks are required to reject a request.'
    ui.notify(rejectError.value, 'error')
    return
  }
  const accepted = await ui.confirm({
    title: 'Reject request',
    message: `Reject ${rejectTarget.value.requestNumber}? This cannot be undone.`,
    confirmText: 'Reject',
    danger: true,
  })
  if (!accepted) return
  rejectError.value = ''
  actionBusy.value = true
  try {
    await requestService.reject(rejectTarget.value._id, remarks)
    ui.notify('Request rejected')
    rejectModal.value = false
    await load()
  } catch (err) {
    showError(err, rejectError)
  } finally {
    actionBusy.value = false
  }
}

onMounted(() => {
  loadDepartments()
  load()
})
</script>

<template>
  <div class="stack">
    <div class="page-header">
      <div>
        <h1>Supply Requests</h1>
        <p>Review incoming requests, approve or reject them, and fulfill approved items.</p>
      </div>
    </div>

    <div v-if="error" class="alert alert-error"><Icon name="warning" :size="16" /><span>{{ error }}</span></div>

    <div class="card">
      <div class="card-header">
        <h2>Requests</h2>
        <span class="muted small">{{ pagination.total }} total</span>
      </div>
      <div class="card-body">
        <div class="toolbar no-print">
          <input v-model="filters.search" class="input search" type="search" placeholder="Search request, requester, or purpose" @input="onSearchInput" />
          <select v-model="filters.status" class="select" @change="applyFilters">
            <option value="">All statuses</option>
            <option v-for="status in REQUEST_STATUSES" :key="status" :value="status">{{ humanize(status) }}</option>
          </select>
          <select v-model="filters.department" class="select" @change="applyFilters">
            <option value="">All departments</option>
            <option v-for="department in departments" :key="department.value" :value="department.value">{{ department.label }}</option>
          </select>
          <input v-model="filters.startDate" class="input" type="date" aria-label="From date" @change="applyFilters" />
          <input v-model="filters.endDate" class="input" type="date" aria-label="To date" @change="applyFilters" />
          <button class="btn btn-primary btn-sm" @click="applyFilters"><Icon name="search" :size="15" /> Search</button>
          <button class="btn btn-outline btn-sm" @click="resetFilters"><Icon name="refresh" :size="15" /> Reset</button>
        </div>

        <DataTable
          :columns="columns"
          :rows="rows"
          :loading="loading"
          empty-title="No requests found"
          empty-message="Try adjusting your search or filters."
        >
          <template #cell-requestNumber="{ row, value }">
            <strong>{{ value || row._id }}</strong>
          </template>
          <template #cell-requestedBy="{ row, value }">
            <div>{{ value?.fullName || '—' }}</div>
            <small class="sub">{{ row.department }}</small>
          </template>
          <template #cell-purpose="{ value }"><span class="truncate">{{ value || '—' }}</span></template>
          <template #cell-dateNeeded="{ value }">{{ formatDate(value) }}</template>
          <template #cell-status="{ value }"><StatusBadge :status="value" :label="humanize(value)" /></template>
          <template #cell-createdAt="{ value }">{{ formatDate(value, true) }}</template>
          <template #cell-actions="{ row }">
            <div class="actions">
              <button class="btn btn-soft btn-sm" @click="openDetails(row)"><Icon name="eye" :size="14" /> View</button>
            </div>
          </template>
        </DataTable>
      </div>
      <Pagination
        :page="pagination.page"
        :limit="pagination.limit"
        :total="pagination.total"
        :pages="pagination.pages"
        @update:page="goToPage"
      />
    </div>

    <Modal v-if="detailsModal" title="Request details" wide @close="closeDetails">
      <div v-if="detailsLoading" class="loading-block"><span class="spinner spinner-dark" /> Loading details…</div>
      <template v-else-if="details">
        <div v-if="detailsError" class="alert alert-error"><Icon name="warning" :size="16" /><span>{{ detailsError }}</span></div>
        <div v-if="hasInsufficient" class="alert alert-warning">
          <Icon name="warning" :size="16" />
          <span>At least one item had insufficient stock when this request was made. Review the projected balances below.</span>
        </div>
        <div class="detail-list">
          <div class="detail-item"><span>Request No.</span><strong>{{ details.requestNumber }}</strong></div>
          <div class="detail-item"><span>Status</span><StatusBadge :status="details.status" :label="humanize(details.status)" /></div>
          <div class="detail-item"><span>Requested By</span><strong>{{ details.requestedBy?.fullName || '—' }}</strong></div>
          <div class="detail-item"><span>Department</span><strong>{{ details.department || details.requestedBy?.department || '—' }}</strong></div>
          <div class="detail-item"><span>Date Needed</span><strong>{{ formatDate(details.dateNeeded) }}</strong></div>
          <div class="detail-item"><span>Submitted</span><strong>{{ formatDate(details.createdAt, true) }}</strong></div>
          <div class="detail-item"><span>Approved By</span><strong>{{ details.approvedBy?.fullName || '—' }}</strong></div>
          <div class="detail-item"><span>Fulfilled By</span><strong>{{ details.fulfilledBy?.fullName || '—' }}</strong></div>
          <div class="detail-item detail-wide"><span>Purpose</span><strong>{{ details.purpose || '—' }}</strong></div>
          <div class="detail-item detail-wide"><span>Remarks</span><strong>{{ details.remarks || '—' }}</strong></div>
        </div>

        <div class="divider" />
        <h3 class="section-title">Requested items</h3>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Code</th><th>Item</th><th>Unit</th><th class="text-right">Requested</th>
                <th class="text-right">Available</th><th class="text-right">Projected</th><th class="text-right">On Hand</th><th class="text-right">Reorder</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in details.items || []" :key="item.item?._id || item.itemCode">
                <td class="strong">{{ item.itemCode }}</td>
                <td>{{ item.itemName }}</td>
                <td>{{ item.unit || item.item?.unit || '—' }}</td>
                <td class="num text-right">{{ formatNumber(item.quantity) }}</td>
                <td class="num text-right">{{ formatNumber(item.availableAtRequest) }}</td>
                <td class="num text-right" :class="{ flag: projected(item) < 0 }">{{ formatNumber(projected(item)) }}</td>
                <td class="num text-right">{{ formatNumber(item.item?.quantity) }}</td>
                <td class="num text-right">{{ formatNumber(item.item?.reorderLevel) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="details.status === 'PENDING'" class="field remarks-field">
          <label for="approval-remarks">Approval remarks (optional)</label>
          <textarea id="approval-remarks" v-model="approvalRemarks" class="textarea" rows="2" placeholder="Add a note for this approval" />
        </div>
      </template>
      <EmptyState v-else icon="clipboard" title="Request unavailable" message="This request could not be loaded." />

      <template #footer>
        <button class="btn btn-outline" :disabled="actionBusy" @click="closeDetails">Close</button>
        <button v-if="details?.status === 'PENDING'" class="btn btn-danger" :disabled="actionBusy" @click="openReject">Reject</button>
        <button v-if="details?.status === 'PENDING'" class="btn btn-primary" :disabled="actionBusy || detailsLoading" @click="approveRequest">Approve</button>
        <button v-if="details?.status === 'APPROVED'" class="btn btn-primary" :disabled="actionBusy || detailsLoading" @click="fulfillRequest">Fulfill</button>
      </template>
    </Modal>

    <Modal v-if="rejectModal" title="Reject request" @close="closeReject">
      <div v-if="rejectError" class="alert alert-error"><Icon name="warning" :size="16" /><span>{{ rejectError }}</span></div>
      <p class="muted small">Rejecting {{ rejectTarget?.requestNumber }} requires a reason.</p>
      <div class="field">
        <label for="reject-remarks">Remarks <span class="required">*</span></label>
        <textarea id="reject-remarks" v-model="rejectRemarks" class="textarea" rows="4" placeholder="Explain why this request is being rejected" />
        <span class="hint">This note is shown to the requester.</span>
      </div>
      <template #footer>
        <button class="btn btn-outline" :disabled="actionBusy" @click="closeReject">Cancel</button>
        <button class="btn btn-danger" :disabled="actionBusy || !rejectRemarks.trim()" @click="submitReject">Reject request</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.sub { display: block; font-size: 0.74rem; color: var(--muted); }
.section-title { font-size: 0.85rem; font-weight: 700; margin: 0 0 10px; }
.flag { color: var(--red); font-weight: 700; }
.detail-wide { grid-column: 1 / -1; }
.remarks-field { margin-top: 18px; }
.required { color: var(--red); }
</style>
