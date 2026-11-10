<script setup lang="ts">
import { onBeforeUnmount, onMounted, provide, ref } from 'vue'
import type * as maplibregl from 'maplibre-gl'
import MapView from '@/map/MapView.vue'
import Hud from '@/ui/Hud.vue'
import { readOptions } from '@/config/options'
import { createEngine } from '@/engine/engine'
import { APP_KEY } from '@/engine/keys'

const options = readOptions()
if (options.lowfx) document.documentElement.classList.add('lowfx')

const engine = createEngine(options)
provide(APP_KEY, engine.context)

const mapReady = ref(false)
const fps = ref(0)
let fpsTimer = 0

async function onMapReady(map: maplibregl.Map) {
  await engine.attachMap(map)
  mapReady.value = true
}

onMounted(() => {
  engine.start()
  if (options.debug) fpsTimer = window.setInterval(() => (fps.value = Math.round(engine.fps())), 500)
})
onBeforeUnmount(() => {
  engine.stop()
  window.clearInterval(fpsTimer)
})
</script>

<template>
  <main class="relative h-full w-full overflow-hidden bg-stone-300">
    <MapView @ready="onMapReady" />
    <Transition
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
      enter-active-class="transition-opacity duration-500"
      leave-active-class="transition-opacity duration-500">
      <Hud v-if="mapReady" />
    </Transition>
    <div
      v-if="options.debug"
      class="glass-soft pointer-events-none absolute bottom-20 left-4 z-50 rounded-full px-3 py-1 text-xs tabular-nums">
      {{ fps }} fps
    </div>
  </main>
</template>
