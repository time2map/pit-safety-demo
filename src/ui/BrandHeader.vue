<script setup lang="ts">
import { computed } from 'vue'
import { useApp } from '@/engine/keys'
import { UI } from '@/config/uiCopy'
import { Badge } from '@/components/ui/badge'

/**
 * Product bar over the left panel, a glass piece of its own: the product name, then the active signal count
 * per level, count first after a "Signals" lead, so the badges read as numbers of signals and not as a status.
 */
const { snapshot } = useApp()
const k = computed(() => snapshot.value.kpis)
</script>

<template>
  <!-- outside any section, so this header is the page banner landmark -->
  <header class="glass-floating flex h-12 shrink-0 items-center gap-3 whitespace-nowrap rounded-full pl-4 pr-3">
    <h1 class="min-w-0 truncate text-[15px] font-semibold tracking-[-0.01em] text-foreground">{{ UI.brand.name }}</h1>
    <div role="group" :aria-label="UI.brand.counts" class="ml-auto flex shrink-0 items-center gap-1.5">
      <span aria-hidden="true" class="mr-0.5 text-xs font-medium text-neutral-600">{{ UI.brand.signals }}</span>
      <Badge size="lg" :tone="k.critical > 0 ? 'critical' : 'neutral'">
        <span aria-hidden="true">{{ UI.brand.critical(k.critical) }}</span>
        <span class="sr-only">{{ UI.brand.criticalFull(k.critical) }}</span>
      </Badge>
      <Badge size="lg" :tone="k.warning > 0 ? 'warning' : 'neutral'">
        <span aria-hidden="true">{{ UI.brand.warning(k.warning) }}</span>
        <span class="sr-only">{{ UI.brand.warningFull(k.warning) }}</span>
      </Badge>
    </div>
  </header>
</template>
