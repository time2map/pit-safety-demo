<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { CheckboxIndicator, CheckboxRoot } from 'reka-ui'
import { Check } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = defineProps<{
  modelValue: boolean
  disabled?: boolean
  id?: string
  class?: HTMLAttributes['class']
}>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <CheckboxRoot
    :id="id"
    :model-value="modelValue"
    :disabled="disabled"
    :class="
      cn(
        'peer inline-flex size-4 shrink-0 items-center justify-center rounded-[5px] border border-black/20 bg-white/80 outline-none transition-colors',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground',
        'focus-visible:ring-2 focus-visible:ring-ring/70 disabled:cursor-default disabled:opacity-50',
        props.class,
      )
    "
    @update:model-value="(v) => emit('update:modelValue', v === true)"
  >
    <CheckboxIndicator class="flex items-center justify-center">
      <Check :size="12" :stroke-width="3" />
    </CheckboxIndicator>
  </CheckboxRoot>
</template>
