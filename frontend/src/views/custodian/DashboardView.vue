<script setup>
import { onMounted, ref } from 'vue'
import StatCard from '../../components/StatCard.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import ChartCanvas from '../../components/ChartCanvas.vue'
import Icon from '../../components/Icon.vue'
import EmptyState from '../../components/EmptyState.vue'
import { dashboardService } from '../../services'
import { useUiStore } from '../../stores/ui'
import { formatDate, formatNumber } from '../../utils/format'

const ui = useUiStore()
const data = ref(null)
const loading = ref(true)

const consumptionData = ref({ labels: [], datasets: [] })
const distributionData = ref({ labels: [], datasets: [] })

function buildCharts(payload) {
  consumptionData.value = {
    labels: payload.consumptionChart.map((row) => row.label),
    datasets: [{
      label: 'Items issued',
      data: payload.consumptionChart.map((row) => row.value),
      borderColor: '#218254',
      backgroundColor: 'rgba(33, 130, 84, 0.12)',
      fill: true,
      tension: 0.35,
      pointBackgroundColor: '#218254',
      pointRadius: 3,
    }],
  }
  distributionData.value = {
    labels: payload.distributionChart.map((row) => row.label),
    datasets: [{
      data: payload.distributionChart.map((row) => row.value),
      backgroundColor: ['#18623e', '#2fa069', '#8ccfa6', '#f0b94f', '#9aa8a0'],
      borderWidth: 0,
    }],
  }
}

async function load() {
  loading.value = true
  try {
    const response = await dashboardService.get()
    data.value = response.data
    buildCharts(response.data)
  } catch (error) {
    ui.notify(error.message, 'error')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="stack">
    <div v-if="loading" class="card loading-block"><span class="spinner spinner-dark" /> Loading dashboard…</div>
    <template v-else-if="data">
      <div class="grid grid-stats">
        <StatCard label="Total Inventory Items" :value="formatNumber(data.stats.totalItems)" icon="package" hint="Active catalog items" />
        <StatCard label="Items In Stock" :value="formatNumber(data.stats.inStock)" icon="check" hint="Above reorder level" />
        <StatCard label="Low-Stock Items" :value="formatNumber(data.stats.lowStock)" icon="warning" tone="amber" hint="Need replenishment" />
        <StatCard label="Out-of-Stock Items" :value="formatNumber(data.stats.outOfStock)" icon="x" tone="red" hint="Unavailable" />
        <StatCard label="Pending Requests" :value="formatNumber(data.stats.pendingRequests)" icon="clipboard" tone="blue" hint="Awaiting review" />
        <StatCard label="Items Issued This Month" :value="formatNumber(data.stats.issuedThisMonth)" icon="arrows" hint="Across fulfilled requests" />
      </div>

      <div class="grid grid-charts">
        <div class="card">
          <div class="card-header"><h2>Inventory Consumption</h2><span class="muted small">Last 6 months</span></div>
          <div class="card-body"><ChartCanvas type="line" :data="consumptionData" /></div>
        </div>
        <div class="card">
          <div class="card-header"><h2>Stock Distribution</h2><span class="muted small">By category</span></div>
          <div class="card-body"><ChartCanvas type="doughnut" :data="distributionData" /></div>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-header">
            <h2>Recent Supply Requests</h2>
            <RouterLink class="btn btn-soft btn-sm" to="/custodian/requests">View all</RouterLink>
          </div>
          <div v-if="data.recentRequests.length" class="list">
            <RouterLink v-for="request in data.recentRequests" :key="request._id" :to="'/custodian/requests'" class="list-row">
              <div class="row-icon"><Icon name="clipboard" :size="16" /></div>
              <div class="list-copy">
                <strong>{{ request.requestNumber }}</strong>
                <small>{{ request.requestedBy?.fullName || 'User' }} &middot; {{ request.department }}</small>
              </div>
              <StatusBadge :status="request.status" />
            </RouterLink>
          </div>
          <EmptyState v-else icon="clipboard" title="No requests yet" message="New requests will appear here." />
        </div>

        <div class="card">
          <div class="card-header">
            <h2>Low-Stock Alerts</h2>
            <RouterLink class="btn btn-soft btn-sm" to="/custodian/alerts">View alerts</RouterLink>
          </div>
          <div v-if="data.lowStockItems.length" class="list">
            <RouterLink v-for="item in data.lowStockItems" :key="item._id" to="/custodian/alerts" class="list-row">
              <div class="row-icon amber"><Icon name="warning" :size="16" /></div>
              <div class="list-copy">
                <strong>{{ item.itemName }}</strong>
                <small>{{ item.itemCode }} &middot; {{ item.category }}</small>
              </div>
              <span class="qty">{{ item.quantity }} / {{ item.reorderLevel }}</span>
            </RouterLink>
          </div>
          <EmptyState v-else icon="check" title="No low-stock items" message="All items are above their reorder levels." />
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2>Recent Inventory Transactions</h2>
          <RouterLink class="btn btn-soft btn-sm" to="/custodian/transactions">View history</RouterLink>
        </div>
        <div v-if="data.recentTransactions.length" class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Transaction ID</th><th>Item</th><th>Type</th><th>Quantity</th><th>Responsible</th><th>Date</th></tr></thead>
            <tbody>
              <tr v-for="tx in data.recentTransactions" :key="tx._id">
                <td class="strong">{{ tx.transactionId }}</td>
                <td>{{ tx.item?.itemName || 'Archived item' }}</td>
                <td><StatusBadge :status="tx.transactionType" /></td>
                <td class="num">{{ tx.quantity }}</td>
                <td>{{ tx.performedBy?.fullName || 'System' }}</td>
                <td>{{ formatDate(tx.createdAt, true) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState v-else icon="arrows" title="No transactions recorded" message="Stock-in and fulfilled requests will appear here." />
      </div>
    </template>
  </div>
</template>

<style scoped>
.list { padding: 6px 10px 10px; }
.list-row { display: flex; align-items: center; gap: 11px; padding: 10px; border-bottom: 1px solid #f0f4f1; color: var(--ink); }
.list-row:last-child { border-bottom: 0; }
.list-row:hover { background: var(--green-50); border-radius: 8px; }
.row-icon { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; background: var(--blue-bg); color: var(--blue); flex-shrink: 0; }
.row-icon.amber { background: var(--amber-bg); color: var(--amber); }
.list-copy { display: grid; gap: 1px; flex: 1; min-width: 0; }
.list-copy strong { font-size: 0.83rem; }
.list-copy small { font-size: 0.74rem; color: var(--muted); }
.qty { font-size: 0.78rem; font-weight: 700; color: var(--amber); }
</style>
