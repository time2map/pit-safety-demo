<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { SignalView } from '@/engine/contract'
import { useApp } from '@/engine/keys'
import { UI } from '@/config/uiCopy'
import { Button } from '@/components/ui/button'

/**
 * Lifecycle buttons of a signal: acknowledge while new, resolve while open (unlocked when the
 * condition clears or every step is done), then whatever the caller adds in the default slot.
 * Used in the signal card footer. Both buttons remove themselves, so keyboard focus moves on to
 * the next button here.
 */
const props = defineProps<{ signal: SignalView }>()

const { commands } = useApp()
const s = computed(() => props.signal)
const resolved = computed(() => s.value.status === 'resolved')

const root = ref<HTMLElement | null>(null)
const hasFocus = () => !!root.value?.contains(document.activeElement)
async function refocus() {
  await nextTick()
  const r = root.value
  if (r?.isConnected) r.querySelector<HTMLElement>('button:not(:disabled)')?.focus()
}

function acknowledge() {
  const f = hasFocus()
  commands.acknowledge(s.value.id)
  if (f) refocus()
}

function resolve() {
  const f = hasFocus()
  commands.resolve(s.value.id)
  if (f) refocus()
}
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
