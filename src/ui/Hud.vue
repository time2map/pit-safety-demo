<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import 'vue-sonner/style.css'
import { useApp } from '@/engine/keys'
import { UI } from '@/config/uiCopy'
import { TooltipProvider } from '@/components/ui/tooltip'
import IntroCard from './IntroCard.vue'
import KpiIsland from './KpiIsland.vue'
import Legend from './Legend.vue'
import MapToolbar from './MapToolbar.vue'
import PresenterDock from './PresenterDock.vue'
import SignalsOutlet from './SignalsOutlet.vue'
import { useCriticalToasts } from './useCriticalToasts'
import { useHotkeys } from './useHotkeys'

/**
 * All floating panels over the full-screen map. Mount inside a positioned parent above the map.
 * The overlay ignores pointer events; each panel opts back in.
 * Left offsets of the free map area (416 and 452 px) follow the signals panel width; keep them
 * in step with the map padding in engine/engine.ts.
 */
const ctx = useApp()
const { snapshot } = ctx
useCriticalToasts(snapshot, ctx.outlet)
useHotkeys(ctx)
</script>

<template>
  <!-- ignore-non-keyboard-focus: focus moved by script after a mouse click (see SignalsOutlet) must not pop a tooltip -->
  <TooltipProvider :delay-duration="300" :skip-delay-duration="200" ignore-non-keyboard-focus>
    <div class="pointer-events-none absolute inset-0 z-10 overflow-hidden text-foreground">
      <!-- top: KPI island centred in the free map area right of the panel -->
      <div class="absolute left-[416px] right-4 top-4 flex justify-center min-[1600px]:left-[452px]">
        <KpiIsland class="pointer-events-auto" />
      </div>

      <!-- left: one panel with the brand header over the signal list or the signal or object card; ends above the map toolbar -->
      <div class="absolute bottom-[90px] left-4 top-4 flex w-[384px] flex-col min-[1600px]:w-[420px]">
        <SignalsOutlet class="pointer-events-auto max-h-full" />
      </div>

      <!-- bottom left: map toolbar under the panel; the bottom offset keeps the MapLibre attribution visible -->
      <MapToolbar class="pointer-events-auto absolute bottom-[34px] left-4" />

      <!-- bottom right: legend -->
      <div class="pointer-events-auto absolute bottom-[34px] right-4">
        <Legend />
      </div>

      <!-- narration caption and presenter dock, centred in the free map area right of the panel and clear of the legend -->
      <div
        class="pointer-events-none absolute bottom-[34px] left-[416px] right-[128px] flex flex-col items-center gap-3 min-[1600px]:left-[452px] min-[1600px]:right-[300px]"
      >
        <Transition
          mode="out-in"
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="opacity-0 translate-y-1"
          leave-active-class="transition duration-200 ease-in"
          leave-to-class="opacity-0"
        >
          <p
            v-if="snapshot.caption"
            :key="snapshot.caption"
            role="status"
            class="glass-soft max-w-[560px] text-balance rounded-2xl px-4 py-2 text-center text-sm font-medium text-foreground"
          >
            {{ snapshot.caption }}
          </p>
        </Transition>
        <PresenterDock />
      </div>
    </div>

    <IntroCard />

    <Toaster
      position="top-center"
      :offset="{ top: 84 }"
      :visible-toasts="3"
      :gap="8"
      :duration="9000"
      :container-aria-label="UI.toast.region"
    />
  </TooltipProvider>
</template>
