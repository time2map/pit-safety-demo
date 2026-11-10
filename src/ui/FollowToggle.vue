<script setup lang="ts">
import { computed } from 'vue'
import { LocateFixed } from 'lucide-vue-next'
import { useApp } from '@/engine/keys'
import { UI } from '@/config/uiCopy'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Small pressed-state toggle for the follow camera on the selected moving object. */
const props = defineProps<{ id: string; label: string }>()
const { snapshot, commands } = useApp()
const on = computed(() => snapshot.value.following === props.id)
</script>

<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <button
        type="button"
        :aria-pressed="on ? 'true' : 'false'"
        :class="
          cn(
            'inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/70',
            on ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-black/5 text-neutral-700 hover:bg-black/10',
          )
        "
        @click="commands.follow(on ? null : id)"
      >
        <LocateFixed :size="13" aria-hidden="true" />
        {{ UI.follow.label }}
      </button>
    </TooltipTrigger>
    <TooltipContent side="bottom">
      {{ on ? UI.follow.stop : UI.follow.start(label) }}
      <kbd class="rounded-md bg-black/5 px-1.5 py-0.5 font-sans text-[11px] font-medium text-muted-foreground">F</kbd>
    </TooltipContent>
  </Tooltip>
</template>
