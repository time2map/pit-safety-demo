<script setup lang="ts">
import { Bell } from 'lucide-vue-next'
import { LEVELS } from '@/engine/contract'
import { LEVEL_LABEL } from '@/config/levels'
import { UI } from '@/config/uiCopy'
import { CATEGORY_ICON } from './icons'
import { TONE } from './tone'

/*
 * Swatches mirror the map pins (.psm-marker in styles/app.css) in the normal status colour:
 * every full pin has the same size and a layer that is off shows the same design smaller; vehicles are a white tile in a coloured frame and people a white disc
 * in a coloured ring, both with a dark glyph; instruments a coloured disc with a white ring and a white glyph.
 */
const OBJECTS = [
  {
    key: 'vehicle',
    label: UI.legend.vehicles,
    icon: CATEGORY_ICON.vehicle,
    tile: 'size-5 rounded-[5px] border-2 border-lv-normal bg-white text-neutral-900',
    glyph: 11,
  },
  {
    key: 'person',
    label: UI.legend.people,
    icon: CATEGORY_ICON.person,
    tile: 'size-5 rounded-full border-2 border-lv-normal bg-white text-neutral-900',
    glyph: 11,
  },
  {
    key: 'sensor',
    label: UI.legend.instruments,
    icon: CATEGORY_ICON.sensor,
    tile: 'size-5 rounded-full border-2 border-white bg-lv-normal text-white',
    glyph: 11,
  },
] as const
</script>

<template>
  <div class="flex flex-col gap-3 text-xs">
    <section>
      <h3 class="mb-1.5 font-medium text-muted-foreground">{{ UI.legend.status }}</h3>
      <ul class="grid grid-cols-2 gap-x-3 gap-y-1.5">
        <li v-for="lv in LEVELS" :key="lv" class="flex items-center gap-2">
          <span :class="['size-2.5 rounded-full ring-2 ring-white/80', TONE[lv].solid]" />
          {{ LEVEL_LABEL[lv] }}
        </li>
        <!-- mirrors the corner badge (.psm-badge in styles/app.css) -->
        <li class="col-span-2 flex items-center gap-2">
          <span class="-ml-[3px] flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px] border-white bg-lv-critical text-white shadow-[0_1px_2px_rgb(0_0_0/0.3)]" aria-hidden="true">
            <Bell :size="9" :stroke-width="3" />
          </span>
          {{ UI.legend.unacknowledged }}
        </li>
      </ul>
    </section>

    <section>
      <h3 class="mb-1.5 font-medium text-muted-foreground">{{ UI.legend.objects }}</h3>
      <ul class="flex flex-col gap-1.5">
        <li v-for="o in OBJECTS" :key="o.key" class="flex items-center gap-2">
          <span class="flex size-5 shrink-0 items-center justify-center" aria-hidden="true">
            <span :class="['flex items-center justify-center shadow-[0_1px_2px_rgb(0_0_0/0.3)]', o.tile]">
              <component :is="o.icon" :size="o.glyph" :stroke-width="2.5" />
            </span>
          </span>
          {{ o.label }}
        </li>
        <li class="flex items-center gap-2">
          <span class="flex size-5 shrink-0 items-center justify-center" aria-hidden="true">
            <span class="flex size-3.5 items-center justify-center rounded-[3px] border-[1.5px] border-lv-normal bg-white text-neutral-900 shadow-[0_1px_2px_rgb(0_0_0/0.3)]">
              <component :is="CATEGORY_ICON.vehicle" :size="8" :stroke-width="2.75" />
            </span>
          </span>
          {{ UI.legend.layerOff }}
        </li>
      </ul>
    </section>

    <section>
      <h3 class="mb-1.5 font-medium text-muted-foreground">{{ UI.legend.zones }}</h3>
      <ul class="flex flex-col gap-1.5">
        <li class="flex items-center gap-2">
          <svg class="size-5 shrink-0" viewBox="0 0 20 20" aria-hidden="true">
            <ellipse cx="10" cy="10" rx="8" ry="5" transform="rotate(-30 10 10)" fill="var(--lv-normal)" fill-opacity="0.22" stroke="var(--lv-normal)" stroke-width="1.5" />
          </svg>
          {{ UI.legend.groundZone }}
        </li>
        <li class="flex items-center gap-2">
          <svg class="size-5 shrink-0" viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="10" cy="10" r="8" fill="none" stroke="#525252" stroke-width="1.5" stroke-dasharray="4 2" />
          </svg>
          {{ UI.legend.blastPeople }}
        </li>
        <li class="flex items-center gap-2">
          <svg class="size-5 shrink-0" viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="10" cy="10" r="5" fill="none" stroke="#525252" stroke-width="1.5" stroke-dasharray="1.6 1.6" />
          </svg>
          {{ UI.legend.blastEquipment }}
        </li>
        <li class="pl-7 text-[11px] leading-4 text-muted-foreground">{{ UI.legend.zoneColourNote }}</li>
      </ul>
    </section>
  </div>
</template>
