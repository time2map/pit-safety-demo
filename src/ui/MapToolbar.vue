<script setup lang="ts">
import type { Component } from 'vue'
import { Compass, Layers, Minus, Plus, Scan, Shapes } from 'lucide-vue-next'
import { LAYER_GROUPS, type LayerGroup } from '@/engine/contract'
import { useApp } from '@/engine/keys'
import { UI } from '@/config/uiCopy'
import { Switch } from '@/components/ui/switch'
import IconButton from './IconButton.vue'
import IconPopover from './IconPopover.vue'
import { CATEGORY_ICON } from './icons'

/** Map controls in one column on the right edge, like most web maps: layers, zoom, north, fit site. Tooltips and the layers popover open to the left. */
const { map, layers } = useApp()

const LAYER_ICON: Record<LayerGroup, Component> = {
  vehicles: CATEGORY_ICON.vehicle,
  people: CATEGORY_ICON.person,
  sensors: CATEGORY_ICON.sensor,
  zones: Shapes,
}
</script>

<template>
  <div role="toolbar" aria-orientation="vertical" :aria-label="UI.map.toolbar" class="flex flex-col items-center gap-2">
    <div class="glass-soft flex flex-col rounded-full p-[3px]">
      <IconPopover :icon="Layers" :label="UI.map.layers" content-class="w-60 p-2">
        <p class="px-2 pb-1.5 pt-1 text-xs font-medium text-muted-foreground">{{ UI.map.layersTitle }}</p>
        <ul class="flex flex-col">
          <li v-for="g in LAYER_GROUPS" :key="g">
            <label
              :for="`layer-${g}`"
              class="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-black/[0.04]"
            >
              <component :is="LAYER_ICON[g]" :size="16" class="text-neutral-600" />
              <span class="flex-1">{{ UI.map.layer[g] }}</span>
              <Switch :id="`layer-${g}`" :model-value="layers[g]" @update:model-value="(on) => map.setLayer(g, on)" />
            </label>
          </li>
        </ul>
        <p class="px-2 pb-1 pt-1.5 text-[11px] leading-4 text-muted-foreground">{{ UI.map.layersHint }}</p>
      </IconPopover>
    </div>

    <div class="glass-soft flex flex-col gap-0.5 rounded-full p-[3px]">
      <IconButton :icon="Plus" :label="UI.map.zoomIn" side="left" @click="map.zoomIn()" />
      <IconButton :icon="Minus" :label="UI.map.zoomOut" side="left" @click="map.zoomOut()" />
    </div>

    <div class="glass-soft flex flex-col gap-0.5 rounded-full p-[3px]">
      <IconButton :icon="Compass" :label="UI.map.resetNorth" side="left" @click="map.resetNorth()" />
      <IconButton :icon="Scan" :label="UI.map.fitSite" side="left" @click="map.fitSite()" />
    </div>
  </div>
</template>
