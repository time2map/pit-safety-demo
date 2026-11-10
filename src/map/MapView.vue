<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, markRaw } from 'vue'
import * as maplibregl from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { SITE } from '@/config/site'
import { baseStyle } from './style'
import { installDevPicker } from './devPicker'

const el = ref<HTMLDivElement | null>(null)
const map = shallowRef<maplibregl.Map | null>(null)
const emit = defineEmits<{ ready: [map: maplibregl.Map] }>()

maplibregl.setWorkerUrl(workerUrl)

onMounted(() => {
  const m = new maplibregl.Map({
    container: el.value!,
    style: baseStyle(),
    center: SITE.center,
    zoom: SITE.initialZoom,
    minZoom: SITE.minZoom,
    maxZoom: SITE.maxZoom,
    maxBounds: SITE.maxBounds,
    // credits live behind the i button in the HUD (ui/MapAttribution.vue)
    attributionControl: false,
    fadeDuration: 0,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    dragRotate: true,
    pitchWithRotate: false,
  })
  map.value = markRaw(m)
  if (import.meta.env.DEV) installDevPicker(m)
  // do not wait for every tile: the HUD and simulation can start once the style is parsed
  if (m.isStyleLoaded()) emit('ready', m)
  else m.once('style.load', () => emit('ready', m))
})

onBeforeUnmount(() => map.value?.remove())
</script>

<template>
  <div class="absolute inset-0">
    <div ref="el" class="h-full w-full" />
  </div>
</template>
