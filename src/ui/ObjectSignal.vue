<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import type { SignalView } from '@/engine/contract'
import { useApp } from '@/engine/keys'
import { LEVEL_LABEL } from '@/config/levels'
import { UI } from '@/config/uiCopy'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import SignalActions from './SignalActions.vue'
import SignalSteps from './SignalSteps.vue'
import { formatAgo } from './format'
import { TONE, statusTone } from './tone'

/**
 * One signal handled right in an object card, so there is no trip to the signal card. Open signals are
 * an accordion: the header is a button, and the expanded block shows the response steps and the
 * acknowledge and resolve buttons. A signal resolved while the card is open stays as a single resolved
 * line. `objectId` is the card's object: when the signal is about another object (a zone entry is about
 * the instrument), that one is named under the title.
 */
const props = defineProps<{ signal: SignalView; objectId: string; expanded: boolean }>()
const emit = defineEmits<{ toggle: [] }>()

const { snapshot } = useApp()
const s = computed(() => props.signal)
const resolved = computed(() => s.value.status === 'resolved')
const open = computed(() => props.expanded && !resolved.value)
const done = computed(() => s.value.checklist.filter((c) => c.done).length)
const when = computed(() =>
  s.value.resolvedAt !== undefined
    ? UI.signals.resolvedAgo(formatAgo(snapshot.value.t - s.value.resolvedAt))
    : UI.signals.opened(formatAgo(snapshot.value.t - s.value.openedAt)),
)
const subline = computed(() => (s.value.subject.id !== props.objectId ? UI.signals.about(s.value.subject.label, when.value) : when.value))
const titleId = `signal-title-${useId()}`
const bodyId = `signal-body-${useId()}`

/* the steps and buttons go away when the signal resolves on its own: keep keyboard focus on this block */
const root = ref<HTMLElement | null>(null)
watch(
  resolved,
  (now) => {
    const r = root.value
    if (!now || !r || !r.contains(document.activeElement) || document.activeElement === r) return
    nextTick(() => r.isConnected && r.focus({ preventScroll: true }))
  },
  { flush: 'pre' },
)
</script>

<template>
  <!-- tabindex and data-focus-fallback: keyboard focus lands here when the control that had it goes away -->
  <div
    ref="root"
    role="group"
    :aria-labelledby="titleId"
    tabindex="-1"
    data-focus-fallback
    :class="
      cn(
        'glass-element rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/70',
        resolved ? 'px-3.5 py-2.5' : open ? 'px-2 pb-3 pt-2' : 'px-2 py-2',
      )
    "
  >
    <h4 :id="titleId" class="text-sm">
      <span v-if="resolved" class="flex items-start gap-2.5">
        <span class="mt-1.5 size-2 shrink-0 rounded-full bg-lv-normal" aria-hidden="true" />
        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
          <span class="font-medium leading-snug text-foreground">{{ s.title }}<span class="sr-only">, {{ LEVEL_LABEL[s.level] }}</span></span>
          <span class="text-xs text-muted-foreground tabular-nums">{{ subline }}</span>
        </span>
        <Badge :tone="statusTone(s)" class="mt-px">{{ UI.signals.status[s.status] }}</Badge>
      </span>
      <button
        v-else
        type="button"
        :aria-expanded="open"
        :aria-controls="open ? bodyId : undefined"
        class="flex w-full items-start gap-2.5 rounded-lg px-1.5 py-1 text-left outline-none hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-ring/70"
        @click="emit('toggle')"
      >
        <span :class="cn('mt-1.5 size-2 shrink-0 rounded-full', TONE[s.level].solid)" aria-hidden="true" />
        <span class="flex min-w-0 flex-1 flex-col gap-0.5">
          <span class="font-medium leading-snug text-foreground">{{ s.title }}<span class="sr-only">, {{ LEVEL_LABEL[s.level] }}</span></span>
          <span class="text-xs text-muted-foreground tabular-nums">
            {{ subline }}<template v-if="!open">, {{ UI.signals.steps(done, s.checklist.length) }}</template>
          </span>
        </span>
        <Badge :tone="statusTone(s)" class="mt-px">{{ UI.signals.status[s.status] }}</Badge>
        <ChevronDown :size="16" :class="cn('mt-0.5 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')" aria-hidden="true" />
      </button>
    </h4>

    <div v-if="open" :id="bodyId">
      <SignalSteps :signal="s" heading="h5" class="mt-2" />
      <SignalActions :signal="s" class="mt-2 px-1.5" />
    </div>
  </div>
</template>
