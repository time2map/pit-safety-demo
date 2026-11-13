<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import 'vue-sonner/style.css'
import { useApp } from '@/engine/keys'
import { UI } from '@/config/uiCopy'
import { TooltipProvider } from '@/components/ui/tooltip'
import BrandHeader from './BrandHeader.vue'
import IntroCard from './IntroCard.vue'
import Legend from './Legend.vue'
import MapAttribution from './MapAttribution.vue'
import MapToolbar from './MapToolbar.vue'
import PresenterDock from './PresenterDock.vue'
import SignalsOutlet from './SignalsOutlet.vue'
import { useCriticalToasts } from './useCriticalToasts'
import { useHotkeys } from './useHotkeys'

/**
 * All floating panels over the full-screen map. Mount inside a positioned parent above the map.
 * The overlay ignores pointer events; each panel opts back in.
 * Left offsets of the free map area (416 and 452 px) follow the signals panel width, the right
 * offset (72 px) the map controls column; keep them in step with the map padding in engine/engine.ts.
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
      <!-- left: the product bar with the active signal counts and the object search (its results float over the panel), and one panel with the signal list or the signal or object card -->
      <div class="absolute bottom-4 left-4 top-4 flex w-[384px] flex-col gap-2 min-[1600px]:w-[420px]">
        <BrandHeader class="pointer-events-auto z-20" />
        <SignalsOutlet class="pointer-events-auto min-h-0" />
      </div>

      <!-- right: map controls in one column, centred on the right edge -->
      <MapToolbar class="pointer-events-auto absolute right-4 top-1/2 -translate-y-1/2" />

      <!-- bottom right, in the same column: legend and the map attribution, both folded to a button -->
      <div class="pointer-events-auto absolute bottom-4 right-4 flex w-10 flex-col items-center gap-2">
        <Legend />
        <MapAttribution />
      </div>

      <!-- narration caption and presenter dock, centred in the free map area between the panel and the map controls -->
      <div
        class="pointer-events-none absolute bottom-4 left-[416px] right-[72px] flex flex-col items-center gap-3 min-[1600px]:left-[452px]"
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
      :offset="{ top: 16 }"
      :visible-toasts="3"
      :gap="8"
      :duration="9000"
      :container-aria-label="UI.toast.region"
    />
  </TooltipProvider>
</template>
