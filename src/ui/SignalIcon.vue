<script setup lang="ts">
import { computed } from 'vue'
import type { ObjectKind, SignalLevel } from '@/engine/contract'
import { cn } from '@/lib/utils'
import { KIND_ICON } from './icons'
import { TONE } from './tone'

/**
 * Leading icon of a signal in rows, cards and toasts: the subject object's glyph on a tile tinted by
 * the signal level. Decorative: the title names the signal.
 * `sm` is the 32 px disc of rows and toasts, `md` the 40 px tile of the signal card header.
 */
const props = withDefaults(defineProps<{ kind: ObjectKind; level: SignalLevel; size?: 'sm' | 'md' }>(), { size: 'sm' })
const md = computed(() => props.size === 'md')
</script>

<template>
  <span
    aria-hidden="true"
    :class="cn('flex shrink-0 items-center justify-center', md ? 'size-10 rounded-xl' : 'size-8 rounded-full', TONE[level].soft)"
  >
    <component :is="KIND_ICON[kind]" :size="md ? 18 : 16" />
  </span>
</template>
