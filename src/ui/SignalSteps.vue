<script setup lang="ts">
import { computed } from 'vue'
import type { SignalView } from '@/engine/contract'
import { useApp } from '@/engine/keys'
import { UI } from '@/config/uiCopy'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/checkbox'

/**
 * Response steps of a signal with their progress, ticked in place in the signal card or in a signal
 * block of an object card. Ticking a step of a new signal also acknowledges it (sim/signals.ts).
 * `heading` sets the level of the "Response steps" heading to fit the outline around it.
 */
const props = withDefaults(defineProps<{ signal: SignalView; heading?: 'h3' | 'h4' | 'h5' }>(), { heading: 'h3' })

const { commands } = useApp()
const s = computed(() => props.signal)
const resolved = computed(() => s.value.status === 'resolved')
const done = computed(() => s.value.checklist.filter((c) => c.done).length)
</script>

<template>
  <!-- a plain block, not a named region: several of these sit in one object card -->
  <div>
    <div class="mb-1 flex items-center justify-between px-1.5 text-xs">
      <component :is="heading" class="font-medium text-muted-foreground">{{ UI.signals.responseSteps }}</component>
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
  </div>
</template>
