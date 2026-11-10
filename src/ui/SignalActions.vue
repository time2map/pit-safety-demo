<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { SignalView } from '@/engine/contract'
import { useApp } from '@/engine/keys'
import { UI } from '@/config/uiCopy'
import { Button } from '@/components/ui/button'

/**
 * Lifecycle buttons of a signal: acknowledge while new, resolve while open (unlocked when the
 * condition clears or every step is done), then whatever the caller adds in the default slot.
 * Used in the signal card footer and in the signal blocks of an object card. Both buttons remove
 * themselves, so keyboard focus moves on to the next button here, or to the nearest element marked
 * data-focus-fallback when none is left.
 */
const props = defineProps<{ signal: SignalView }>()

const { commands } = useApp()
const s = computed(() => props.signal)
const resolved = computed(() => s.value.status === 'resolved')

const root = ref<HTMLElement | null>(null)
const hasFocus = () => !!root.value?.contains(document.activeElement)
/* the fallback is looked up before the action: a resolved signal block may drop these buttons altogether */
async function refocus(fallback: HTMLElement | null) {
  await nextTick()
  const r = root.value
  const next = (r?.isConnected ? r.querySelector<HTMLElement>('button:not(:disabled)') : null) ?? (fallback?.isConnected ? fallback : null)
  next?.focus({ preventScroll: true })
  next?.scrollIntoView({ block: 'nearest' })
}

function act(run: () => void) {
  const f = hasFocus()
  const fallback = root.value?.closest<HTMLElement>('[data-focus-fallback]') ?? null
  run()
  if (f) refocus(fallback)
}

const acknowledge = () => act(() => commands.acknowledge(s.value.id))
const resolve = () => act(() => commands.resolve(s.value.id))
</script>

<template>
  <div ref="root">
    <div class="flex flex-wrap items-center gap-1.5">
      <Button v-if="s.status === 'new'" size="sm" @click="acknowledge">{{ UI.signals.acknowledge }}</Button>
      <Button v-if="!resolved" variant="secondary" size="sm" :disabled="!s.canResolve" @click="resolve">{{ UI.signals.resolve }}</Button>
      <slot />
    </div>
    <p v-if="!resolved && !s.canResolve" class="mt-1.5 text-xs text-muted-foreground">{{ UI.signals.resolveHint }}</p>
  </div>
</template>
