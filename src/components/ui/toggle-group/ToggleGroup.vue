<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { ToggleGroupRoot } from 'reka-ui'
import { cn } from '@/lib/utils'

/** Single-select segmented control. Clicking the active item keeps it selected. */
const props = defineProps<{
  modelValue: string
  disabled?: boolean
  class?: HTMLAttributes['class']
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

function onUpdate(v: unknown) {
  if (typeof v === 'string' && v) emit('update:modelValue', v)
}
</script>

<template>
  <ToggleGroupRoot
    type="single"
    :model-value="modelValue"
    :disabled="disabled"
    :class="cn('inline-flex h-8 items-center gap-0.5 rounded-full bg-black/[0.06] p-0.5', props.class)"
    @update:model-value="onUpdate"
  >
    <slot />
  </ToggleGroupRoot>
</template>
