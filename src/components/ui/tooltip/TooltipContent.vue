<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { TooltipContent, TooltipPortal } from 'reka-ui'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    side?: 'top' | 'right' | 'bottom' | 'left'
    align?: 'start' | 'center' | 'end'
    sideOffset?: number
    class?: HTMLAttributes['class']
  }>(),
  { side: 'top', align: 'center', sideOffset: 8 },
)
</script>

<template>
  <TooltipPortal>
    <TooltipContent
      :side="side"
      :align="align"
      :side-offset="sideOffset"
      :collision-padding="12"
      :class="
        cn(
          'z-50 flex items-center gap-2 rounded-lg border border-black/5 bg-white/92 px-2.5 py-1.5 text-xs font-medium text-foreground shadow-[0_6px_20px_rgb(0_0_0/0.12)] backdrop-blur-md',
          'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          props.class,
        )
      "
    >
      <slot />
    </TooltipContent>
  </TooltipPortal>
</template>
