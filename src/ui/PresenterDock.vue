<script setup lang="ts">
import { computed } from 'vue'
import { EyeOff, Pause, Play, Presentation, RotateCcw } from 'lucide-vue-next'
import type { StoryId } from '@/engine/contract'
import { useApp } from '@/engine/keys'
import { STORY_HINT } from '@/config/copy'
import { UI } from '@/config/uiCopy'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import IconButton from './IconButton.vue'

const { snapshot, commands, dockVisible } = useApp()
const s = computed(() => snapshot.value)
const STORY_KEY: Record<StoryId, string> = { ground: '1', blast: '2', fire: '3', seismic: '4' }

const setDock = (on: boolean) => (dockVisible.value = on)

function onSpeed(v: string) {
  const n = Number(v)
  if (n === 1 || n === 2 || n === 4) commands.setSpeed(n)
}
</script>

<template>
  <!-- the narration caption is rendered by Hud, in the free map area right of the signals panel -->
  <div class="flex flex-col items-center">
    <Transition
      mode="out-in"
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 translate-y-2"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0 translate-y-2"
    >
      <section
        v-if="dockVisible"
        :aria-label="UI.dock.region"
        class="glass-floating pointer-events-auto flex h-14 items-center gap-1 whitespace-nowrap rounded-full px-2"
      >
        <IconButton
          :icon="s.paused ? Play : Pause"
          :label="s.paused ? UI.dock.play : UI.dock.pause"
          :shortcut="UI.hotkeys.space"
          variant="default"
          size="icon"
          @click="commands.togglePause()"
        />

        <ToggleGroup :model-value="String(s.speed)" :aria-label="UI.dock.speed" class="h-9" @update:model-value="onSpeed">
          <ToggleGroupItem v-for="sp in [1, 2, 4]" :key="sp" :value="String(sp)" class="w-8 px-0">{{ sp }}x</ToggleGroupItem>
        </ToggleGroup>

        <Separator orientation="vertical" class="mx-0.5" />

        <Tooltip>
          <TooltipTrigger as-child>
            <label class="flex cursor-pointer items-center gap-2 rounded-full px-1 text-xs font-medium">
              <Switch :model-value="s.autoplay" @update:model-value="(on) => commands.setAutoplay(on)" />
              {{ UI.dock.autoplay }}
            </label>
          </TooltipTrigger>
          <TooltipContent>{{ UI.dock.autoplayHint }}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" class="mx-0.5" />

        <div role="group" :aria-label="UI.dock.stories" class="flex items-center gap-1">
          <Tooltip v-for="st in s.stories" :key="st.id">
            <TooltipTrigger as-child>
              <!-- wrapper keeps the tooltip working while the button is disabled -->
              <span class="inline-flex">
                <button
                  type="button"
                  :disabled="s.autoplay"
                  :aria-label="st.title"
                  :class="
                    cn(
                      'relative h-9 overflow-hidden rounded-full px-2.5 text-xs font-medium outline-none transition-colors',
                      'bg-white/55 hover:bg-white focus-visible:ring-2 focus-visible:ring-ring/70 disabled:cursor-default disabled:hover:bg-white/55',
                      st.state === 'running' ? 'bg-white text-foreground shadow-[0_1px_3px_rgb(0_0_0/0.08)]' : 'text-neutral-700',
                      s.autoplay && st.state !== 'running' && 'text-neutral-500',
                    )
                  "
                  @click="commands.triggerStory(st.id)"
                >
                  {{ st.title }}
                  <span class="absolute inset-x-2.5 bottom-1.5 h-0.5 overflow-hidden rounded-full bg-black/[0.08]">
                    <span
                      :class="cn('block h-full rounded-full transition-[width] duration-500 ease-linear', st.state === 'done' ? 'bg-neutral-400' : 'bg-primary')"
                      :style="{ width: `${Math.round(Math.min(1, Math.max(0, st.progress)) * 100)}%` }"
                    />
                  </span>
                </button>
              </span>
            </TooltipTrigger>
            <TooltipContent class="max-w-64 flex-wrap">
              <span class="font-normal">{{ s.autoplay ? UI.dock.storiesLocked : STORY_HINT[st.id] }}</span>
              <kbd v-if="!s.autoplay" class="rounded-md bg-black/5 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">{{
                STORY_KEY[st.id]
              }}</kbd>
            </TooltipContent>
          </Tooltip>
        </div>

        <Separator orientation="vertical" class="mx-0.5" />

        <IconButton :icon="RotateCcw" :label="UI.dock.reset" shortcut="R" @click="commands.reset()" />
        <IconButton :icon="EyeOff" :label="UI.dock.hide" shortcut="H" class="mr-0.5" @click="setDock(false)" />
      </section>

      <div v-else class="pointer-events-auto">
        <IconButton
          :icon="Presentation"
          :label="UI.dock.show"
          shortcut="H"
          variant="ghost"
          class="glass-soft size-9 hover:bg-white/70"
          @click="setDock(true)"
        />
      </div>
    </Transition>
  </div>
</template>
