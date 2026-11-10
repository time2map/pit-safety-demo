<script setup lang="ts">
import { LayoutList } from 'lucide-vue-next'
import { UI } from '@/config/uiCopy'
import IconPopover from './IconPopover.vue'
import LegendContent from './LegendContent.vue'

/** Legend folded to an icon button in the bottom right; the card opens to the left of it. */
</script>

<template>
  <IconPopover
    :icon="LayoutList"
    :label="UI.legend.title"
    align="end"
    size="icon"
    :icon-size="18"
    class="glass-soft hover:bg-white/70"
    content-class="w-[268px] p-3.5"
  >
    <LegendContent />
  </IconPopover>
</template>
