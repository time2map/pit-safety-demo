<script setup lang="ts">
import { computed } from 'vue'
import type { ObjectDetail } from '@/engine/contract'
import { useApp } from '@/engine/keys'
import { cn } from '@/lib/utils'
import AnimatedValue from './AnimatedValue.vue'
import LiveChart from './LiveChart.vue'
import { formatUpdated } from './format'
import { TONE } from './tone'

/** Main live value, last update and the 30 min chart of an object. Used by the object and signal cards. */
const props = defineProps<{ detail: ObjectDetail; chartHeight?: number }>()
const { snapshot } = useApp()
const d = computed(() => props.detail)
const chartLevel = computed(() => d.value.headline?.level ?? d.value.level)
</script>

<template>
  <div>
    <template v-if="d.headline">
      <p class="text-xs text-muted-foreground">{{ d.headline.label }}</p>
      <p class="mt-0.5 flex items-baseline gap-1.5">
        <AnimatedValue
          :key="d.id"
          :value="d.headline.value"
          :class="cn('text-3xl font-semibold tracking-[-0.02em]', d.headline.level !== 'normal' && TONE[d.headline.level].text)"
        />
        <span class="text-sm text-muted-foreground">{{ d.headline.unit }}</span>
      </p>
    </template>
    <p class="mt-0.5 text-xs text-muted-foreground tabular-nums">{{ formatUpdated(d.updatedAgoS) }}</p>
    <div v-if="d.series" class="mt-3">
      <p v-if="!d.headline || d.headline.label !== d.series.label" class="mb-1.5 text-xs font-medium text-neutral-700">
        {{ d.series.label }}, {{ d.series.unit }}
      </p>
      <LiveChart :series="d.series" :now="snapshot.t" :level="chartLevel" :height="chartHeight" />
    </div>
  </div>
</template>
