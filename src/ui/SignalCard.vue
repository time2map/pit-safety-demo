<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import { FOLLOW_KINDS, type ObjectDetail, type SignalView } from '@/engine/contract'
import { useApp } from '@/engine/keys'
import type { OutletView } from '@/engine/outlet'
import { KIND_LABEL } from '@/config/copy'
import { LEVEL_LABEL } from '@/config/levels'
import { UI } from '@/config/uiCopy'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import FollowToggle from './FollowToggle.vue'
import ReadingBlock from './ReadingBlock.vue'
import SignalActions from './SignalActions.vue'
import SignalSteps from './SignalSteps.vue'
import { formatAgo, formatUpdated } from './format'
import { KIND_ICON } from './icons'
import SignalIcon from './SignalIcon.vue'
import { statusTone } from './tone'
import { useKeptScroll } from './useKeptScroll'

/**
 * Event card of one signal in the left panel: what happened in a short header (title with its status,
 * subject and place, age; the level shows in the icon colour), the response steps right under it, then
 * the subject's live data and who is involved, with the lifecycle actions in the footer. The steps come
 * first so they are on screen without scrolling on a 1280 x 720 projector.
 * `subject` is the live detail of the signal's subject when the map selection holds it;
 * `view` is this card's outlet stack entry, used to keep the scroll position.
 */
const props = defineProps<{ signal: SignalView; subject: ObjectDetail | null; view?: OutletView }>()

const { snapshot, commands, outlet } = useApp()
const scroller = ref<HTMLElement | null>(null)
useKeptScroll(scroller, () => props.view)
const s = computed(() => props.signal)
const when = computed(() =>
  s.value.resolvedAt !== undefined
    ? UI.signals.resolvedAgo(formatAgo(snapshot.value.t - s.value.resolvedAt))
    : UI.signals.opened(formatAgo(snapshot.value.t - s.value.openedAt)),
)
const hasReading = computed(() => !!props.subject && (!!props.subject.headline || !!props.subject.series))
/* the subject leads the involved list for blast entries; it already has its own block above */
const involved = computed(() => s.value.involved.filter((o) => o.id !== s.value.subject.id || !props.subject))
</script>

<template>
  <article :aria-label="s.title" class="flex min-h-0 flex-col">
    <header class="flex shrink-0 items-start gap-3 px-4 pb-3 pt-1.5">
      <SignalIcon size="md" :kind="s.subject.kind" :level="s.level" />
      <div class="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        <div class="flex items-start justify-between gap-2">
          <h2 class="text-base font-semibold leading-snug tracking-[-0.01em]">
            {{ s.title }}<span class="sr-only">, {{ LEVEL_LABEL[s.level] }}</span>
          </h2>
          <Badge :tone="statusTone(s)" class="mt-0.5">{{ UI.signals.status[s.status] }}</Badge>
        </div>
        <p class="break-words text-xs text-muted-foreground">
          <span class="font-medium text-neutral-700">{{ s.subject.label }}</span>, {{ s.place }}
        </p>
        <p class="text-xs text-muted-foreground tabular-nums">{{ when }}</p>
      </div>
    </header>

    <div ref="scroller" class="thin-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-4">
      <SignalSteps :signal="s" class="glass-element rounded-xl px-2 pb-2 pt-3" />

      <section v-if="subject" class="glass-element rounded-xl p-3.5">
        <div class="mb-1 flex items-center justify-between gap-2">
          <h3 class="min-w-0 truncate text-xs font-medium text-neutral-700">{{ UI.signals.liveData(subject.label) }}</h3>
          <div class="-mr-1 flex shrink-0 items-center gap-1">
            <FollowToggle v-if="FOLLOW_KINDS.includes(subject.kind)" :id="subject.id" :label="subject.label" />
            <button
              type="button"
              :aria-label="UI.signals.detailsOf(subject.label)"
              class="inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium text-neutral-700 outline-none hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-ring/70"
              @click="outlet.openObject(subject.id)"
            >
              {{ UI.signals.details }}
              <ChevronRight :size="14" aria-hidden="true" />
            </button>
          </div>
        </div>
        <ReadingBlock v-if="hasReading" :detail="subject" :chart-height="80" />
        <template v-else>
          <p class="text-sm text-foreground">{{ subject.subtitle || KIND_LABEL[subject.kind] }}</p>
          <p class="mt-0.5 text-xs text-muted-foreground tabular-nums">{{ formatUpdated(subject.updatedAgoS) }}</p>
        </template>
      </section>

      <section v-if="involved.length">
        <h3 class="mb-1.5 text-xs font-medium text-muted-foreground">{{ UI.signals.involved }}</h3>
        <ul class="flex flex-col gap-1">
          <li v-for="o in involved" :key="o.id">
            <button
              type="button"
              class="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left text-sm outline-none hover:bg-black/[0.04] focus-visible:ring-2 focus-visible:ring-ring/70"
              @click="outlet.openObject(o.id)"
            >
              <span class="flex size-7 items-center justify-center rounded-full bg-black/5 text-neutral-700">
                <component :is="KIND_ICON[o.kind]" :size="14" />
              </span>
              <span class="font-medium">{{ o.label }}</span>
              <span class="text-xs text-muted-foreground">{{ KIND_LABEL[o.kind] }}</span>
              <ChevronRight :size="14" class="ml-auto text-muted-foreground" />
            </button>
          </li>
        </ul>
      </section>
    </div>

    <footer class="shrink-0 border-t border-black/[0.06] px-4 pb-3.5 pt-3">
      <SignalActions :signal="s">
        <Button variant="secondary" size="sm" @click="commands.focus(s.subject.id)">{{ UI.signals.showOnMap }}</Button>
      </SignalActions>
    </footer>
  </article>
</template>
