<script setup lang="ts">
import { Info } from 'lucide-vue-next'
import { UI } from '@/config/uiCopy'
import { ATTRIBUTION } from '@/map/style'
import IconPopover from './IconPopover.vue'

/** Map attribution folded to an i button in the bottom right corner; the credits open to the left of it. */
</script>

<template>
  <IconPopover
    :icon="Info"
    :label="UI.attribution.label"
    align="end"
    size="icon-xs"
    :icon-size="14"
    class="glass-soft text-neutral-600 hover:bg-white/70"
    content-class="w-max max-w-[300px] rounded-lg px-3 py-2 text-[11px] leading-4 text-neutral-600"
  >
    <p>{{ ATTRIBUTION.satellite }}</p>
    <p class="mt-0.5">
      <a href="https://maplibre.org/" target="_blank" rel="noopener" class="font-medium text-neutral-700 underline-offset-2 hover:underline">MapLibre</a>
    </p>
  </IconPopover>
</template>
