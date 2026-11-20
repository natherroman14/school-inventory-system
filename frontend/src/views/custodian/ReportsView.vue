<script setup>
import { computed, onMounted, ref } from 'vue'
import StatCard from '../../components/StatCard.vue'
import DataTable from '../../components/DataTable.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import ChartCanvas from '../../components/ChartCanvas.vue'
import EmptyState from '../../components/EmptyState.vue'
import Icon from '../../components/Icon.vue'
import { reportService } from '../../services'
import { useUiStore } from '../../stores/ui'
import { formatDate, formatNumber } from '../../utils/format'
import { exportCsv, exportPdf, printReport } from '../../utils/export'

const ui = useUiStore()

const REPORTS = [
  { key: 'inventory', label: 'Inventory Status', type: 'inventory' },
  { key: 'low-stock', label: 'Low-Stock', type: 'inventory', status: 'LOW STOCK' },
  { key: 'out-of-stock', label: 'Out-of-Stock', type: 'inventory', status: 'OUT OF STOCK' },
  { key: 'stock-in', label: 'Stock-In', type: 'transactions', transactionType: 'STOCK_IN' },
  { key: 'stock-out', label: 'Stock-Out', type: 'transactions', transactionType: 'STOCK_OUT' },
  { key: 'consumption', label: 'Inventory Consumption', type: 'consumption' },
  { key: 'department-consumption', label: 'Department-Based Consumption', type: 'consumption' },
  { key: 'requests', label: 'Supply Request', type: 'requests' },
]

const selectedKey = ref('inventory')
const filters = ref({ startDate: '', endDate: '', item: '', category: '', department: '', transactionType: '' })
const categories = ref([])
const departments = ref([])
const items = ref([])
const report = ref(null)
const loading = ref(true)
const error = ref('')

const selected = computed(() => REPORTS.find((entry) => entry.key === selectedKey.value) || REPORTS[0])
const reportTitle = computed(() => selected.value.label)
const filename = computed(() => `report-${selectedKey.value}`)

const visibleFilters = computed(() => {
  switch (selected.value.type) {
    case 'inventory': return ['category', 'item']
    case 'transactions': return ['startDate', 'endDate', 'item', 'transactionType']
    case 'consumption': return selectedKey.value === 'department-consumption' ? ['startDate', 'endDate', 'department'] : ['startDate', 'endDate', 'item']
    default: return ['startDate', 'endDate', 'department']
  }
})

const columns = computed(() => (report.value?.columns || []).map((column) => ({ key: column.key, label: column.label })))

const displayRows = computed(() => {
  const rows = report.value?.rows || []
  if (!selected.value.status) return rows
  return rows.filter((row) => String(row.status || '').toUpperCase() === selected.value.status)
})

const summaryEntries = computed(() => Object.entries(report.value?.summary || {}).map(([key, value]) => ({
  label: labelFor(key),
  value: typeof value === 'number' ? formatNumber(value) : (value == null ? '—' : String(value)),
})))

const departmentTable = computed(() => {
  const rows = report.value?.byDepartment || []
  if (!rows.length) return { rows: [], columns: [] }
  const keys = Object.keys(rows[0])
  return { rows, columns: keys.map((key) => ({ key, label: labelFor(key) })) }
})

const departmentChart = computed(() => {
  const rows = report.value?.byDepartment || []
  if (!rows.length) return { labels: [], datasets: [] }
  const keys = Object.keys(rows[0])
  const labelKey = ['label', 'department', 'name', 'itemName'].find((key) => keys.includes(key)) || keys[0]
  const valueKey = ['value', 'total', 'quantity', 'count', 'amount', 'consumed'].find((key) => keys.includes(key)) || keys[keys.length - 1]
  return {
    labels: rows.map((row) => String(row[labelKey] ?? '—')),
    datasets: [{
      label: 'Consumption',
      data: rows.map((row) => Number(row[valueKey]) || 0),
      backgroundColor: '#218254',
      borderRadius: 6,
    }],
  }
})

const showChart = computed(() => selectedKey.value === 'department-consumption' && departmentChart.value.labels.length > 0)

function labelFor(value) {
  return String(value)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function displayValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'number') return formatNumber(value)
  if (typeof value === 'object') return value.fullName || value.itemName || value.department || JSON.stringify(value)
  return String(value)
}

function showError(err, target = error) {
  target.value = err.message || 'Unable to complete the request'
  ui.notify(target.value, 'error')
}

function toOptions(payload) {
  const source = payload?.data || payload || {}
  const list = Array.isArray(source) ? source : (source.departments || source.categories || [])
  return list.map((entry) => {
    if (typeof entry === 'string') return { value: entry, label: entry }
    const value = entry.department ?? entry.name ?? entry.value ?? entry._id
    return { value, label: entry.label ?? entry.name ?? entry.department ?? value }
  }).filter((option) => option.value)
}

async function loadMetadata() {
  try {
    const response = await reportService.metadata()
    const payload = response?.data || response
    categories.value = toOptions(payload.categories)
    departments.value = toOptions(payload.departments)
    items.value = (payload.items || []).map((item) => ({ value: item._id, label: `${item.itemCode} · ${item.itemName}` }))
  } catch (err) {
    showError(err)
  }
}

function params() {
  const result = {}
  const values = filters.value
  for (const key of ['startDate', 'endDate', 'item', 'category', 'department', 'transactionType']) {
    if (values[key] !== '' && values[key] !== null && values[key] !== undefined) result[key] = values[key]
  }
  return result
}

async function load() {
  loading.value = true
  error.value = ''
  report.value = null
  try {
    const response = await reportService.get(selected.value.type, params())
    const payload = response?.data || response
    report.value = payload?.rows || payload?.columns ? payload : (payload?.data || payload)
  } catch (err) {
    showError(err)
  } finally {
    loading.value = false
  }
}

function onReportChange() {
  filters.value.transactionType = selected.value.transactionType || ''
  load()
}

function resetFilters() {
  filters.value = {
    startDate: '',
    endDate: '',
    item: '',
    category: '',
    department: '',
    transactionType: selected.value.transactionType || '',
  }
  load()
}

function isVisible(key) {
  return visibleFilters.value.includes(key)
}

function subtitle() {
  const parts = []
  if (filters.value.startDate) parts.push(`From ${formatDate(filters.value.startDate)}`)
  if (filters.value.endDate) parts.push(`To ${formatDate(filters.value.endDate)}`)
  if (filters.value.department) parts.push(`Department: ${filters.value.department}`)
  if (filters.value.category) parts.push(`Category: ${filters.value.category}`)
  return parts.join(' · ')
}

function exportFilename() {
  return filename.value
}

function downloadCsv() {
  if (!displayRows.value.length) return
  try {
    exportCsv(displayRows.value, columns.value, exportFilename(), reportTitle.value)
    ui.notify('CSV downloaded')
  } catch (err) {
    showError(err)
  }
}

async function downloadPdf() {
  if (!displayRows.value.length) return
  try {
    await exportPdf({
      title: reportTitle.value,
      subtitle: subtitle(),
      columns: columns.value,
      rows: displayRows.value,
      filename: exportFilename(),
      summary: report.value?.summary || {},
    })
    ui.notify('PDF downloaded')
  } catch (err) {
    showError(err)
  }
}

function printCurrentReport() {
  if (!displayRows.value.length) return
  printReport()
}

onMounted(async () => {
  await loadMetadata()
  filters.value.transactionType = selected.value.transactionType || ''
  await load()
})
</script>

<template>
  <div class="stack">
    <div class="page-header">
      <div>
        <h1>Reports</h1>
        <p>Generate, review, and export inventory reports from current records.</p>
      </div>
      <div class="page-actions no-print">
        <button class="btn btn-outline" :disabled="loading || !displayRows.length" @click="downloadCsv"><Icon name="download" :size="16" /> CSV</button>
        <button class="btn btn-outline" :disabled="loading || !displayRows.length" @click="downloadPdf"><Icon name="file" :size="16" /> PDF</button>
        <button class="btn btn-soft" :disabled="loading || !displayRows.length" @click="printCurrentReport"><Icon name="printer" :size="16" /> Print</button>
      </div>
    </div>

    <div class="print-heading">
      <h1>{{ reportTitle }}</h1>
      <p v-if="subtitle()">{{ subtitle() }}</p>
    </div>

    <div v-if="error" class="alert alert-error"><Icon name="warning" :size="16" /><span>{{ error }}</span></div>

    <div class="card">
      <div class="card-header">
        <h2>Report filters</h2>
        <select v-model="selectedKey" class="select report-select no-print" @change="onReportChange">
          <option v-for="entry in REPORTS" :key="entry.key" :value="entry.key">{{ entry.label }}</option>
        </select>
      </div>
      <div class="card-body">
        <div class="toolbar no-print">
          <template v-if="isVisible('startDate')">
            <input v-model="filters.startDate" class="input" type="date" aria-label="Start date" @change="load" />
          </template>
          <template v-if="isVisible('endDate')">
            <input v-model="filters.endDate" class="input" type="date" aria-label="End date" @change="load" />
          </template>
          <template v-if="isVisible('item')">
            <select v-model="filters.item" class="select" @change="load">
              <option value="">All items</option>
              <option v-for="item in items" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </template>
          <template v-if="isVisible('category')">
            <select v-model="filters.category" class="select" @change="load">
              <option value="">All categories</option>
              <option v-for="category in categories" :key="category.value" :value="category.value">{{ category.label }}</option>
            </select>
          </template>
          <template v-if="isVisible('department')">
            <select v-model="filters.department" class="select" @change="load">
              <option value="">All departments</option>
              <option v-for="department in departments" :key="department.value" :value="department.value">{{ department.label }}</option>
            </select>
          </template>
          <template v-if="isVisible('transactionType')">
            <select v-model="filters.transactionType" class="select" @change="load">
              <option value="STOCK_IN">Stock In</option>
              <option value="STOCK_OUT">Stock Out</option>
            </select>
          </template>
          <button class="btn btn-primary btn-sm" @click="load"><Icon name="refresh" :size="15" /> Generate</button>
          <button class="btn btn-outline btn-sm" @click="resetFilters">Reset</button>
        </div>

        <div v-if="loading" class="loading-block"><span class="spinner spinner-dark" /> Generating {{ reportTitle.toLowerCase() }}…</div>
        <template v-else-if="report">
          <div v-if="summaryEntries.length" class="grid grid-stats summary-grid">
            <StatCard v-for="entry in summaryEntries" :key="entry.label" :label="entry.label" :value="entry.value" icon="chart" />
          </div>
        </template>
        <EmptyState v-else icon="chart" title="No report data" message="Try different filters or generate the report again." />
      </div>
    </div>

    <template v-if="!loading && report">
      <div class="card">
        <div class="card-header">
          <h2>{{ reportTitle }}</h2>
          <span class="muted small">{{ displayRows.length }} rows · {{ subtitle() || 'All dates' }}</span>
        </div>
        <div class="card-body">
          <DataTable
            :columns="columns"
            :rows="displayRows"
            :loading="loading"
            empty-title="No rows in this report"
            empty-message="Try widening the date range or clearing filters."
          >
            <template v-for="column in columns" :key="column.key" #[`cell-${column.key}`]="{ value }">
              <StatusBadge v-if="column.key === 'status'" :status="value" />
              <span v-else>{{ displayValue(value) }}</span>
            </template>
          </DataTable>
        </div>
      </div>

      <div v-if="showChart" class="card">
        <div class="card-header"><h2>Consumption by Department</h2><span class="muted small">From report data</span></div>
        <div class="card-body"><ChartCanvas type="bar" :data="departmentChart" /></div>
      </div>

      <div v-if="departmentTable.rows.length" class="card">
        <div class="card-header"><h2>Department Breakdown</h2></div>
        <div class="card-body">
          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr><th v-for="column in departmentTable.columns" :key="column.key">{{ column.label }}</th></tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in departmentTable.rows" :key="index">
                  <td v-for="column in departmentTable.columns" :key="column.key" :class="{ num: typeof row[column.key] === 'number' }">{{ displayValue(row[column.key]) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.report-select { min-width: 240px; }
.summary-grid { margin-top: 4px; }
.print-heading { display: none; }
@media print {
  .print-heading { display: block; margin-bottom: 18px; }
  .print-heading h1 { font-size: 1.2rem; margin: 0 0 4px; }
  .print-heading p { margin: 0; color: var(--muted); font-size: 0.85rem; }
}
</style>
