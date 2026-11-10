<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { BookOpen } from 'lucide-vue-next'
import { UI } from '@/config/uiCopy'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import LegendContent from './LegendContent.vue'

/** Pill with a popover below 1600 px, always-open compact card above. */
const wide = useMediaQuery('(min-width: 1600px)')
</script>

<template>
  <section v-if="wide" :aria-label="UI.legend.title" class="glass-floating w-[268px] rounded-xl p-3.5">
    <LegendContent />
  </section>
  <Popover v-else>
    <PopoverTrigger as-child>
      <Button variant="ghost" class="glass-soft h-9 gap-1.5 px-3.5 text-sm hover:bg-white/70">
        <BookOpen :size="16" />
        {{ UI.legend.title }}
      </Button>
    </PopoverTrigger>
    <PopoverContent side="top" align="end" class="w-[268px] p-3.5">
      <LegendContent />
    </PopoverContent>
  </Popover>
</template>
