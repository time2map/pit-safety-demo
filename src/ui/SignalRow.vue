<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ChevronRight, ListChecks } from 'lucide-vue-next'
import type { SignalView } from '@/engine/contract'
import { useApp } from '@/engine/keys'
import { LEVEL_LABEL } from '@/config/levels'
import { UI } from '@/config/uiCopy'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatAgo } from './format'
import { CATEGORY_ICON } from './icons'
import SignalIcon from './SignalIcon.vue'
import { statusTone } from './tone'

/**
 * One signal in the list, kept short: what happened and on which object, its status and age. The place
 * and the reading with its limit are left to the signal card. The whole row opens that card.
 */
const props = defineProps<{ signal: SignalView; now: number }>()

const { outlet } = useApp()
const s = computed(() => props.signal)
const resolved = computed(() => s.value.status === 'resolved')
const done = computed(() => s.value.checklist.filter((c) => c.done).length)
const age = computed(() => formatAgo(props.now - (s.value.resolvedAt ?? s.value.openedAt)))

/* brief one-off highlight for fresh critical signals, only while the list is on screen */
const listHidden = computed(() => outlet.stack.length > 0)
const flash = ref(false)
onMounted(() => {
  const fresh = s.value.level === 'critical' && s.value.status === 'new' && props.now - s.value.openedAt < 6
  if (fresh && !flashed.has(s.value.id)) {
    flashed.add(s.value.id)
    flash.value = !listHidden.value
  }
})
/* a hidden list cannot play the flash, and the browser would replay it on return, so drop it */
watch(listHidden, (hidden) => {
  if (hidden) flash.value = false
})
</script>

<script lang="ts">
/* module scope: shared by all rows so each signal flashes at most once */
const flashed = new Set<string>()

/** Forget which signals already flashed. Call on a reset, since a new run reuses the same signal ids. */
export function clearSignalFlashes() {
  flashed.clear()
}
</script>

<template>
  <button
    type="button"
    :data-signal-id="s.id"
    :class="
      cn(
        'glass-element flex w-full gap-3 rounded-xl p-3 text-left outline-none transition-[opacity,background-color] hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-ring/70',
        resolved && 'opacity-80',
        flash && 'signal-arrive',
      )
    "
    @click="outlet.openSignal(s.id)"
    @animationend="flash = false"
  >
    <SignalIcon class="mt-0.5" :kind="s.subject.kind" :level="s.level" />

    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="flex items-start justify-between gap-2">
        <span class="line-clamp-2 text-sm font-medium leading-snug text-foreground">
          {{ s.title }}<span class="sr-only">, {{ LEVEL_LABEL[s.level] }}</span>
        </span>
        <Badge :tone="statusTone(s)" class="mt-px">{{ UI.signals.status[s.status] }}</Badge>
      </span>
      <span class="truncate text-xs font-medium text-neutral-700">{{ s.subject.label }}</span>
      <span class="mt-1 flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
        <span>{{ age }}</span>
        <Tooltip v-if="s.people > 0">
          <TooltipTrigger as-child>
            <span class="inline-flex items-center gap-1">
              <component :is="CATEGORY_ICON.person" :size="14" aria-hidden="true" /><span aria-hidden="true">{{ s.people }}</span>
              <span class="sr-only">{{ UI.signals.people(s.people) }}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>{{ UI.signals.people(s.people) }}</TooltipContent>
        </Tooltip>
        <Tooltip v-if="s.vehicles > 0">
          <TooltipTrigger as-child>
            <span class="inline-flex items-center gap-1">
              <component :is="CATEGORY_ICON.vehicle" :size="14" aria-hidden="true" /><span aria-hidden="true">{{ s.vehicles }}</span>
              <span class="sr-only">{{ UI.signals.vehicles(s.vehicles) }}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>{{ UI.signals.vehicles(s.vehicles) }}</TooltipContent>
        </Tooltip>
        <Tooltip v-if="done > 0 && !resolved">
          <TooltipTrigger as-child>
            <span class="inline-flex items-center gap-1">
              <ListChecks :size="14" aria-hidden="true" /><span aria-hidden="true">{{ UI.signals.stepsShort(done, s.checklist.length) }}</span>
              <span class="sr-only">{{ UI.signals.stepsDone(done, s.checklist.length) }}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>{{ UI.signals.stepsDone(done, s.checklist.length) }}</TooltipContent>
        </Tooltip>
      </span>
    </span>

    <ChevronRight :size="16" class="shrink-0 self-center text-muted-foreground" aria-hidden="true" />
  </button>
</template>
