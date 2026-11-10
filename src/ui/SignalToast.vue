<script setup lang="ts">
import { ArrowUpRight } from 'lucide-vue-next'
import type { ObjectKind } from '@/engine/contract'
import { UI } from '@/config/uiCopy'
import SignalIcon from './SignalIcon.vue'

/** Custom vue-sonner toast body for a critical signal. Click opens the signal card. */
const props = defineProps<{
  title: string
  /** kind of the signal's subject, for its icon */
  kind: ObjectKind
  subject: string
  place: string
  openSignal: () => void
  /** injected by vue-sonner */
  isPaused?: boolean
}>()
const emit = defineEmits<{ closeToast: [] }>()

function open() {
  props.openSignal()
  emit('closeToast')
}
</script>

<template>
  <button
    type="button"
    class="glass-floating flex w-[356px] items-start gap-3 rounded-xl p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/70"
    @click="open"
  >
    <SignalIcon :kind="kind" level="critical" />
    <span class="flex min-w-0 flex-1 flex-col gap-0.5">
      <span class="text-sm font-medium leading-snug text-foreground">{{ title }}</span>
      <span class="truncate text-xs text-muted-foreground">
        <span class="font-medium text-neutral-700">{{ subject }}</span>, {{ place }}
      </span>
    </span>
    <span class="mt-0.5 inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-neutral-700">
      {{ UI.toast.open }}
      <ArrowUpRight :size="14" />
    </span>
  </button>
</template>
