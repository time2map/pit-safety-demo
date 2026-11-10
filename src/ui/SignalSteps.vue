<script setup lang="ts">
import { computed, useId } from 'vue'
import type { SignalView } from '@/engine/contract'
import { useApp } from '@/engine/keys'
import { UI } from '@/config/uiCopy'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'

/**
 * Response steps of a signal with their progress, ticked in place in the signal card.
 * Ticking a step of a new signal also acknowledges it (sim/signals.ts).
 */
const props = defineProps<{ signal: SignalView }>()

const { commands } = useApp()
const s = computed(() => props.signal)
const resolved = computed(() => s.value.status === 'resolved')
const done = computed(() => s.value.checklist.filter((c) => c.done).length)
/* per instance, so ids stay unique whatever else shows the same signal */
const headingId = `steps-${useId()}`
</script>

<template>
  <section :aria-labelledby="headingId">
    <div class="mb-1 flex items-center justify-between px-1.5 text-xs">
      <h3 :id="headingId" class="font-medium text-muted-foreground">{{ UI.signals.responseSteps }}</h3>
      <span class="text-muted-foreground tabular-nums">{{ UI.signals.steps(done, s.checklist.length) }}</span>
    </div>
    <ul class="flex flex-col gap-0.5">
      <li v-for="step in s.checklist" :key="step.id">
        <label
          :class="
            cn(
              'flex items-start gap-2.5 rounded-lg px-1.5 py-1.5 text-sm',
              resolved ? 'cursor-default' : 'cursor-pointer hover:bg-black/[0.03]',
            )
          "
        >
          <Checkbox class="mt-0.5" :model-value="step.done" :disabled="resolved" @update:model-value="commands.toggleStep(s.id, step.id)" />
          <span :class="cn('leading-snug', step.done ? 'text-muted-foreground line-through decoration-black/25' : 'text-foreground')">{{
            step.label
          }}</span>
        </label>
      </li>
    </ul>
  </section>
</template>
