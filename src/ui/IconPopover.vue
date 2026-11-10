<script setup lang="ts">
import type { Component, HTMLAttributes } from 'vue'
import { Button, type ButtonVariants } from '@/components/ui/button'
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * Icon-only button with a tooltip that opens a popover; the popover content goes in the default slot.
 * `side` places both the tooltip and the popover, `class` styles the button.
 * The popover gets its own anchor outside the tooltip: nested in the tooltip trigger, the popover
 * trigger would register itself as the tooltip's anchor and leave the popover unplaced.
 */
withDefaults(
  defineProps<{
    label: string
    icon: Component
    side?: 'top' | 'right' | 'bottom' | 'left'
    align?: 'start' | 'center' | 'end'
    size?: ButtonVariants['size']
    iconSize?: number
    class?: HTMLAttributes['class']
    contentClass?: HTMLAttributes['class']
  }>(),
  { side: 'left', align: 'center', size: 'icon-sm', iconSize: 16 },
)
</script>

<template>
  <Popover>
    <PopoverAnchor class="flex">
      <Tooltip>
        <TooltipTrigger as-child>
          <PopoverTrigger as-child>
            <Button variant="ghost" :size="size" :class="$props.class" :aria-label="label">
              <component :is="icon" :size="iconSize" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent :side="side">{{ label }}</TooltipContent>
      </Tooltip>
    </PopoverAnchor>
    <PopoverContent :side="side" :align="align" :class="contentClass">
      <slot />
    </PopoverContent>
  </Popover>
</template>
