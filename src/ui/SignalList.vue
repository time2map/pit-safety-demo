<script setup lang="ts">
import { computed, onBeforeUpdate, onUpdated, ref, watch } from 'vue'
import { Archive, ShieldCheck } from 'lucide-vue-next'
import { useApp } from '@/engine/keys'
import { UI } from '@/config/uiCopy'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import SignalRow, { clearSignalFlashes } from './SignalRow.vue'

/** The bottom view of the left panel: active or resolved signals. A row opens its signal card. */
const { snapshot } = useApp()
const tab = ref<'active' | 'resolved'>('active')

/* a reset restarts sim time and reuses the same signal ids, so drop per-signal UI state from the previous run */
watch(
  () => snapshot.value.t,
  (t, prev) => {
    if (prev === undefined || t >= prev) return
    tab.value = 'active'
    clearSignalFlashes()
  },
)

const list = computed(() => (tab.value === 'active' ? snapshot.value.signalsActive : snapshot.value.signalsResolved))

/* a row moved by a re-sort (an escalation) loses keyboard focus; give it back */
const scroller = ref<HTMLElement | null>(null)
let kept: HTMLElement | null = null
onBeforeUpdate(() => {
  const a = document.activeElement
  kept = a instanceof HTMLElement && scroller.value?.contains(a) ? a : null
})
onUpdated(() => {
  const k = kept
  kept = null
  const a = document.activeElement
  if (k?.isConnected && (!a || a === document.body)) k.focus({ preventScroll: true })
})
</script>

<template>
  <div class="flex min-h-0 flex-col">
    <header class="flex shrink-0 items-center justify-between gap-3 px-4 pb-3 pt-3.5">
      <h2 class="text-base font-semibold tracking-[-0.01em]">{{ UI.signals.title }}</h2>
      <ToggleGroup
        :model-value="tab"
        :aria-label="UI.signals.filter"
        @update:model-value="(v) => (tab = v === 'resolved' ? 'resolved' : 'active')"
      >
        <ToggleGroupItem value="active">
          {{ UI.signals.active }}
          <span class="text-muted-foreground">{{ snapshot.signalsActive.length }}</span>
        </ToggleGroupItem>
        <ToggleGroupItem value="resolved">
          {{ UI.signals.resolved }}
          <span class="text-muted-foreground">{{ snapshot.signalsResolved.length }}</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </header>

    <div ref="scroller" class="thin-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 pb-2.5">
      <TransitionGroup v-if="list.length" tag="ul" name="signal-list" class="relative flex flex-col gap-2">
        <li v-for="sig in list" :key="sig.id">
          <SignalRow :signal="sig" :now="snapshot.t" />
        </li>
      </TransitionGroup>

      <div v-else class="flex flex-col items-center gap-2 px-6 pb-8 pt-6 text-center">
        <span
          class="flex size-10 items-center justify-center rounded-full"
          :class="tab === 'active' ? 'bg-lv-normal-bg text-lv-normal-fg' : 'bg-black/5 text-neutral-500'"
        >
          <ShieldCheck v-if="tab === 'active'" :size="18" />
          <Archive v-else :size="18" />
        </span>
        <p class="text-sm font-medium">{{ tab === 'active' ? UI.signals.emptyActive : UI.signals.emptyResolved }}</p>
        <p class="text-xs text-muted-foreground">
          {{ tab === 'active' ? UI.signals.emptyActiveHint : UI.signals.emptyResolvedHint }}
        </p>
      </div>
    </div>
  </div>
</template>
