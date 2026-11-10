<script setup lang="ts">
import { computed, ref } from 'vue'
import { useElementSize } from '@vueuse/core'
import type { Level, SeriesView } from '@/engine/contract'
import { UI } from '@/config/uiCopy'
import { formatNumber } from './format'
import { LEVEL_VAR } from './tone'

/**
 * Lightweight live line chart: last 30 min, area fill, dashed limit lines, current value dot.
 * The window ends at `now` (sim time), so the line stops where the readings stop.
 */
const props = withDefaults(defineProps<{ series: SeriesView; now: number; level?: Level; height?: number; windowS?: number }>(), {
  level: 'normal',
  height: 120,
  windowS: 1800,
})

const el = ref<HTMLDivElement | null>(null)
const { width } = useElementSize(el)
const PAD = { l: 2, r: 2, t: 10, b: 6 }

const t0 = computed(() => props.now - props.windowS)
/** at least one reading inside the window (t is ascending) */
const hasData = computed(() => {
  const t = props.series.t
  return t.length > 0 && t[t.length - 1]! >= t0.value
})

const chart = computed(() => {
  const w = Math.floor(width.value)
  const h = props.height
  const { t, v, warn, crit } = props.series
  if (w < 40 || !hasData.value) return null
  const t0v = t0.value
  let i0 = t.findIndex((x) => x >= t0v)
  if (i0 > 0) i0 -= 1 // keep one point left of the window so the line reaches the edge
  const ts = t.slice(i0)
  const vs = v.slice(i0)

  let lo = Math.min(...vs)
  let hi = Math.max(...vs)
  if (warn != null) hi = Math.max(hi, warn)
  if (crit != null) hi = Math.max(hi, crit)
  if (lo >= 0 && lo < hi * 0.25) lo = 0
  const span = hi - lo || Math.abs(hi) || 1
  hi += span * 0.12
  if (lo !== 0) lo -= span * 0.12

  const x = (tt: number) => PAD.l + ((Math.min(Math.max(tt, t0v), props.now) - t0v) / props.windowS) * (w - PAD.l - PAD.r)
  const y = (vv: number) => PAD.t + (1 - (vv - lo) / (hi - lo)) * (h - PAD.t - PAD.b)
  const pts = ts.map((tt, i) => [x(tt), y(vs[i]!)] as const)
  const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join('')
  const first = pts[0]!
  const last = pts[pts.length - 1]!
  const base = h - PAD.b
  const area = `${line}L${last[0].toFixed(1)},${base}L${first[0].toFixed(1)},${base}Z`

  const limits: { key: string; y: number; label: string; color: string; below: boolean }[] = []
  if (crit != null) limits.push({ key: 'c', y: y(crit), label: `${UI.detail.critLimit} ${fmt(crit)}`, color: LEVEL_VAR.critical, below: false })
  if (warn != null) limits.push({ key: 'w', y: y(warn), label: `${UI.detail.warnLimit} ${fmt(warn)}`, color: LEVEL_VAR.warning, below: false })
  if (limits.length === 2 && Math.abs(limits[0]!.y - limits[1]!.y) < 15) limits[1]!.below = true

  return { w, h, line, area, last, limits }
})

function fmt(n: number) {
  return formatNumber(n, Math.abs(n) < 10 && !Number.isInteger(n) ? 1 : 0)
}
</script>

<template>
  <div>
    <div ref="el" class="relative w-full" :style="{ height: `${height}px` }">
      <svg v-if="chart" :width="chart.w" :height="chart.h" :viewBox="`0 0 ${chart.w} ${chart.h}`" class="absolute inset-0 overflow-visible" aria-hidden="true">
        <path :d="chart.area" fill="rgb(23 23 23 / 0.06)" />
        <g v-for="l in chart.limits" :key="l.key">
          <line :x1="0" :x2="chart.w" :y1="l.y" :y2="l.y" :stroke="l.color" stroke-width="1.25" stroke-dasharray="4 4" />
          <text
            :x="chart.w - 2"
            :y="l.below ? l.y + 13 : l.y - 5"
            text-anchor="end"
            class="text-[11px] font-medium"
            fill="#525252"
            paint-order="stroke"
            stroke="rgb(255 255 255 / 0.85)"
            stroke-width="3"
          >
            {{ l.label }}
          </text>
        </g>
        <path :d="chart.line" fill="none" stroke="#171717" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round" />
        <circle v-if="level !== 'offline'" :cx="chart.last[0]" :cy="chart.last[1]" r="4.5" :fill="LEVEL_VAR[level]" stroke="#fff" stroke-width="2" />
      </svg>
      <div v-else-if="!hasData" class="flex h-full items-center justify-center text-xs text-muted-foreground">{{ UI.detail.noReadings }}</div>
    </div>
    <div class="mt-1.5 flex justify-between text-xs text-muted-foreground">
      <span>{{ UI.detail.chartWindow }}</span>
      <span>{{ UI.detail.now }}</span>
    </div>
  </div>
</template>
