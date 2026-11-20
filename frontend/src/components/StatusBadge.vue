<script setup>
import { computed } from 'vue'
import { statusTone } from '../utils/format'

const props = defineProps({
  status: { type: String, default: '' },
  label: { type: String, default: '' },
})

const classes = computed(() => statusTone(props.status))
const text = computed(() => props.label || props.status)
</script>

<template>
  <span class="badge" :class="classes">{{ text }}</span>
</template>
