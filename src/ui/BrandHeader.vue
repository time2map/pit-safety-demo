<script setup lang="ts">
import { UI } from '@/config/uiCopy'
</script>

<template>
  <!-- top of the left panel: product, site and the simulated data note, above the signal list or card -->
  <header class="flex shrink-0 items-center gap-2.5 whitespace-nowrap border-b border-black/[0.06] px-3.5 py-3">
    <!-- mark: a monitoring ring with a live status dot -->
    <svg class="size-8 shrink-0" viewBox="0 0 32 32" role="img" :aria-label="UI.brand.markLabel">
      <circle cx="16" cy="16" r="16" fill="#171717" />
      <circle cx="16" cy="16" r="8" fill="none" stroke="#fff" stroke-width="2.25" />
      <circle cx="16" cy="16" r="2.25" fill="#fff" fill-opacity="0.55" />
      <circle cx="21.66" cy="10.34" r="3.4" fill="var(--lv-normal)" stroke="#171717" stroke-width="1.6" />
    </svg>
    <div class="flex min-w-0 flex-col leading-tight">
      <span class="text-sm font-semibold tracking-[-0.01em] text-foreground">{{ UI.brand.name }}</span>
      <span class="text-xs text-muted-foreground">{{ UI.brand.site }}</span>
    </div>
    <span class="ml-auto inline-flex h-5 items-center rounded-full bg-black/[0.06] px-2 text-xs font-medium text-neutral-600">{{
      UI.brand.simulated
    }}</span>
  </header>
</template>
