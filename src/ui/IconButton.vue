<script setup lang="ts">
import type { Component, HTMLAttributes } from 'vue'
import { Button, type ButtonVariants } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Icon-only pill button with a light tooltip and an aria-label. */
withDefaults(
  defineProps<{
    label: string
    icon: Component
    shortcut?: string
    side?: 'top' | 'right' | 'bottom' | 'left'
    variant?: ButtonVariants['variant']
    size?: ButtonVariants['size']
    iconSize?: number
    disabled?: boolean
    class?: HTMLAttributes['class']
  }>(),
  { side: 'top', variant: 'ghost', size: 'icon-sm', iconSize: 16 },
)
defineEmits<{ click: [e: MouseEvent] }>()
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <Button
        :variant="variant"
        :size="size"
        :class="$props.class"
        :aria-label="label"
        :disabled="disabled"
        @click="$emit('click', $event)"
      >
        <component :is="icon" :size="iconSize" />
      </Button>
    </TooltipTrigger>
    <TooltipContent :side="side">
      {{ label }}
      <kbd
        v-if="shortcut"
        class="rounded-md bg-black/5 px-1.5 py-0.5 font-sans text-[11px] font-medium text-muted-foreground"
        >{{ shortcut }}</kbd
      >
    </TooltipContent>
  </Tooltip>
</template>
