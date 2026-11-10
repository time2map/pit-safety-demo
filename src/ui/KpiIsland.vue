<script setup lang="ts">
import { computed } from 'vue'
import { useApp } from '@/engine/keys'
import { UI } from '@/config/uiCopy'
import { BLAST_PHASE_LABEL } from '@/config/copy'
import { Badge } from '@/components/ui/badge'
import { formatClock, formatDuration } from './format'

const { snapshot } = useApp()
const k = computed(() => snapshot.value.kpis)
const clock = computed(() => formatClock(snapshot.value.epochMs + snapshot.value.t * 1000))

const blast = computed(() => {
  const b = k.value.nextBlast
  if (!b) return null
  const before = b.phase === 'scheduled' || b.phase === 'armed' || b.phase === 'final'
  const inS = Math.ceil(b.inS)
  let text: string
  if (before && inS > 0) text = UI.kpi.blastIn(b.label, formatDuration(inS))
  else if (inS >= -2 && b.phase !== 'clear') text = UI.kpi.blastFiring(b.label)
  else text = UI.kpi.blastFired(b.label, formatDuration(-b.inS))
  const hot = (before && inS > 0 && inS <= 60) || b.phase === 'final'
  return { text, phase: BLAST_PHASE_LABEL[b.phase], hot }
})

const cells = computed(() => [
  { key: 'eq', label: UI.kpi.equipment, value: UI.kpi.equipmentValue(k.value.equipmentOnline, k.value.equipmentTotal) },
  { key: 'pp', label: UI.kpi.people, value: UI.kpi.peopleValue(k.value.people) },
  { key: 'sn', label: UI.kpi.sensors, value: UI.kpi.sensorsValue(k.value.sensorsReporting, k.value.sensorsTotal) },
])
</script>

<template>
  <section
    :aria-label="UI.kpi.region"
    class="glass-floating flex h-14 items-stretch whitespace-nowrap rounded-full px-2 py-1.5"
  >
    <div class="flex flex-col justify-center px-3.5">
      <span class="text-xs text-muted-foreground">{{ UI.kpi.siteTime }}</span>
      <time class="text-sm font-semibold tabular-nums">{{ clock }}</time>
    </div>

    <template v-for="c in cells" :key="c.key">
      <div class="my-1.5 w-px bg-black/[0.08]" />
      <div class="flex flex-col justify-center px-3.5">
        <span class="text-xs text-muted-foreground">{{ c.label }}</span>
        <span class="text-sm font-medium tabular-nums">{{ c.value }}</span>
      </div>
    </template>

    <div class="my-1.5 w-px bg-black/[0.08]" />
    <div class="flex items-center gap-1.5 px-3.5">
      <Badge size="lg" :tone="k.critical > 0 ? 'critical' : 'neutral'">{{ UI.kpi.critical }} {{ k.critical }}</Badge>
      <Badge size="lg" :tone="k.warning > 0 ? 'warning' : 'neutral'">{{ UI.kpi.warning }} {{ k.warning }}</Badge>
    </div>

    <div class="my-1.5 w-px bg-black/[0.08]" />
    <div
      class="flex min-w-[176px] flex-col justify-center rounded-full px-4 transition-colors duration-300"
      :class="blast?.hot ? 'bg-lv-critical-bg text-lv-critical-fg' : ''"
    >
      <span class="text-xs" :class="blast?.hot ? 'text-lv-critical-fg/80' : 'text-muted-foreground'">{{
        blast ? blast.phase : UI.kpi.nextBlast
      }}</span>
      <span class="text-sm font-medium tabular-nums">{{ blast ? blast.text : UI.kpi.noBlast }}</span>
    </div>
  </section>
</template>
