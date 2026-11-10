<script setup lang="ts">
import type { Component } from 'vue'
import { Compass, Layers, Minus, Plus, Scan, Shapes } from 'lucide-vue-next'
import { LAYER_GROUPS, type Basemap, type LayerGroup } from '@/engine/contract'
import { useApp } from '@/engine/keys'
import { UI } from '@/config/uiCopy'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import IconButton from './IconButton.vue'
import { CATEGORY_ICON } from './icons'

const { map, basemap, layers } = useApp()

const LAYER_ICON: Record<LayerGroup, Component> = {
  vehicles: CATEGORY_ICON.vehicle,
  people: CATEGORY_ICON.person,
  sensors: CATEGORY_ICON.sensor,
  zones: Shapes,
}

function onBasemap(v: string) {
  if (v === 'satellite' || v === 'light') map.setBasemap(v as Basemap)
}
</script>

<template>
  <div role="toolbar" :aria-label="UI.map.toolbar" class="glass-soft flex h-11 items-center gap-1 rounded-full px-1.5">
    <IconButton :icon="Minus" :label="UI.map.zoomOut" @click="map.zoomOut()" />
    <IconButton :icon="Plus" :label="UI.map.zoomIn" @click="map.zoomIn()" />
    <IconButton :icon="Compass" :label="UI.map.resetNorth" @click="map.resetNorth()" />

    <Separator orientation="vertical" class="mx-1 h-5" />

    <ToggleGroup :model-value="basemap" :aria-label="UI.map.basemap" @update:model-value="onBasemap">
      <ToggleGroupItem value="satellite">{{ UI.map.satellite }}</ToggleGroupItem>
      <ToggleGroupItem value="light">{{ UI.map.light }}</ToggleGroupItem>
    </ToggleGroup>

    <Separator orientation="vertical" class="mx-1 h-5" />

    <Popover>
      <PopoverTrigger as-child>
        <Button variant="ghost" size="sm" class="gap-1.5 px-3">
          <Layers :size="16" />
          {{ UI.map.layers }}
        </Button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" class="w-60 p-2">
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
      </PopoverContent>
    </Popover>

    <IconButton :icon="Scan" :label="UI.map.fitSite" @click="map.fitSite()" />
  </div>
</template>
