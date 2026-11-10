<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { ToggleGroupItem } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = defineProps<{
  value: string
  disabled?: boolean
  class?: HTMLAttributes['class']
}>()
</script>

<template>
  <ToggleGroupItem
    :value="value"
    :disabled="disabled"
    :class="
      cn(
        'inline-flex h-full items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-medium text-muted-foreground outline-none transition-[color,background-color,box-shadow] tabular-nums',
        'hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70 disabled:pointer-events-none disabled:opacity-40',
        'data-[state=on]:bg-white data-[state=on]:text-foreground data-[state=on]:shadow-[0_1px_3px_rgb(0_0_0/0.1)]',
        props.class,
      )
    "
  >
    <slot />
  </ToggleGroupItem>
</template>
