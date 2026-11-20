<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  Chart, BarController, BarElement, DoughnutController, ArcElement, LineController, LineElement,
  CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler,
} from 'chart.js'

Chart.register(BarController, BarElement, DoughnutController, ArcElement, LineController, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler)

const props = defineProps({
  type: { type: String, default: 'line' },
  data: { type: Object, required: true },
  options: { type: Object, default: () => ({}) },
})

const canvas = ref(null)
let chart = null

function render() {
  if (!canvas.value) return
  if (chart) chart.destroy()
  chart = new Chart(canvas.value, {
    type: props.type,
    data: props.data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: props.type === 'doughnut', position: 'bottom', labels: { boxWidth: 12, usePointStyle: true, font: { size: 11 } } } },
      scales: props.type === 'doughnut' ? undefined : {
        y: { beginAtZero: true, ticks: { precision: 0, color: '#65786d' }, grid: { color: '#edf3ee' } },
        x: { ticks: { color: '#65786d' }, grid: { display: false } },
      },
      ...props.options,
    },
  })
}

onMounted(render)
watch(() => props.data, render, { deep: true })
onBeforeUnmount(() => chart?.destroy())
</script>

<template>
  <div class="chart-box"><canvas ref="canvas" /></div>
</template>
