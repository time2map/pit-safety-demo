<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { formatNumber, parseNumber } from './format'

/** Shows a formatted value and tweens between numeric updates; non-numeric values switch instantly. */
const props = defineProps<{ value: string }>()
const shown = ref(props.value)
let raf = 0

const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

watch(
  () => props.value,
  (next) => {
    cancelAnimationFrame(raf)
    const a = parseNumber(shown.value)
    const b = parseNumber(next)
    if (reduced || !a || !b || a.n === b.n) {
      shown.value = next
      return
    }
    const start = performance.now()
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / 450)
      const e = 1 - (1 - k) ** 3
      shown.value = k < 1 ? formatNumber(a.n + (b.n - a.n) * e, b.digits) : next
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
  },
)

onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <span class="tabular-nums">{{ shown }}</span>
</template>
