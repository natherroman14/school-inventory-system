<script setup>
import { onMounted, ref } from 'vue'
import StatCard from '../../components/StatCard.vue'
import StatusBadge from '../../components/StatusBadge.vue'
import ChartCanvas from '../../components/ChartCanvas.vue'
import Icon from '../../components/Icon.vue'
import EmptyState from '../../components/EmptyState.vue'
import { dashboardService } from '../../services'
import { useAuthStore } from '../../stores/auth'
import { useUiStore } from '../../stores/ui'
import { formatDate, formatNumber } from '../../utils/format'

const auth = useAuthStore()
const ui = useUiStore()
const data = ref(null)
const loading = ref(true)
const chart = ref({ labels: [], datasets: [] })

async function load() {
  loading.value = true
  try {
    const response = await dashboardService.get()
    data.value = response.data
    chart.value = {
      labels: response.data.consumptionChart.map((row) => row.label),
      datasets: [{
        label: 'Supplies issued',
        data: response.data.consumptionChart.map((row) => row.value),
        borderColor: '#218254',
        backgroundColor: 'rgba(33, 130, 84, 0.13)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#218254',
      }],
    }
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
    <div class="welcome card card-pad">
      <div>
        <p class="muted small" style="margin-bottom: 4px">{{ formatDate(new Date()) }}</p>
        <h1 style="margin-bottom: 4px">Good day, {{ auth.user?.fullName?.split(' ')[0] }}</h1>
        <p class="muted" style="margin: 0">Check stock availability and submit a request for your department.</p>
      </div>
      <RouterLink class="btn btn-primary" to="/dean/requests/new"><Icon name="plus" :size="17" /> New supply request</RouterLink>
    </div>

    <div v-if="loading" class="card loading-block"><span class="spinner spinner-dark" /> Loading dashboard…</div>
    <template v-else-if="data">
      <div class="grid grid-stats">
        <StatCard label="Available Items" :value="formatNumber(data.stats.totalItems)" icon="package" hint="In the active catalog" />
        <StatCard label="Items In Stock" :value="formatNumber(data.stats.inStock)" icon="check" hint="Ready to request" />
        <StatCard label="Low-Stock Items" :value="formatNumber(data.stats.lowStock)" icon="warning" tone="amber" hint="Limited quantity" />
        <StatCard label="My Pending Requests" :value="formatNumber(data.stats.pendingRequests)" icon="clipboard" tone="blue" hint="Awaiting decision" />
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-header"><h2>My Recent Requests</h2><RouterLink class="btn btn-soft btn-sm" to="/dean/requests">View all</RouterLink></div>
          <div v-if="data.recentRequests.length" class="list">
            <RouterLink v-for="request in data.recentRequests" :key="request._id" to="/dean/requests" class="list-row">
              <div class="row-icon"><Icon name="clipboard" :size="16" /></div>
              <div class="list-copy">
                <strong>{{ request.requestNumber }}</strong>
                <small>{{ request.items.length }} item(s) &middot; {{ formatDate(request.createdAt) }}</small>
              </div>
              <StatusBadge :status="request.status" />
            </RouterLink>
          </div>
          <EmptyState v-else icon="clipboard" title="No requests submitted" message="Your submitted requests will appear here." />
        </div>

        <div class="card">
          <div class="card-header"><h2>Consumption Trend</h2><span class="muted small">Campus-wide, last 6 months</span></div>
          <div class="card-body"><ChartCanvas type="line" :data="chart" /></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h2>Low-Stock Supplies</h2><RouterLink class="btn btn-soft btn-sm" to="/dean/inventory">Browse inventory</RouterLink></div>
        <div v-if="data.lowStockItems.length" class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Item Code</th><th>Item Name</th><th>Category</th><th>Available</th><th>Reorder Level</th></tr></thead>
            <tbody>
              <tr v-for="item in data.lowStockItems" :key="item._id">
                <td class="strong">{{ item.itemCode }}</td>
                <td>{{ item.itemName }}</td>
                <td>{{ item.category }}</td>
                <td class="num">{{ item.quantity }} {{ item.unit }}</td>
                <td class="num">{{ item.reorderLevel }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState v-else icon="check" title="No low-stock supplies" message="All catalog items are well stocked." />
      </div>
    </template>
  </div>
</template>

<style scoped>
.welcome { display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap; background: linear-gradient(100deg, var(--green-800), var(--green-700)); color: #fff; border-color: transparent; }
.welcome .muted { color: #cfe6d7; }
.list { padding: 6px 10px 10px; }
.list-row { display: flex; align-items: center; gap: 11px; padding: 10px; border-bottom: 1px solid #f0f4f1; color: var(--ink); }
.list-row:last-child { border-bottom: 0; }
.list-row:hover { background: var(--green-50); border-radius: 8px; }
.row-icon { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; background: var(--blue-bg); color: var(--blue); }
.list-copy { display: grid; gap: 1px; flex: 1; min-width: 0; }
.list-copy strong { font-size: 0.83rem; }
.list-copy small { font-size: 0.74rem; color: var(--muted); }
</style>
