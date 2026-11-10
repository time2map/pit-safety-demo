<script lang="ts">
/* per outlet stack entry, like the scroll position (useKeptScroll): the signals a card has shown and their place in it */
const placesByEntry = new WeakMap<object, Map<string, number>>()
</script>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, toRaw, watch } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import { FOLLOW_KINDS, type ObjectDetail, type SignalView } from '@/engine/contract'
import { useApp } from '@/engine/keys'
import type { OutletView } from '@/engine/outlet'
import { KIND_LABEL } from '@/config/copy'
import { LEVEL_LABEL } from '@/config/levels'
import { UI } from '@/config/uiCopy'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import FollowToggle from './FollowToggle.vue'
import ObjectSignal from './ObjectSignal.vue'
import ReadingBlock from './ReadingBlock.vue'
import { formatNumber, formatUpdated } from './format'
import { KIND_ICON } from './icons'
import { TONE } from './tone'
import { pinLeaving } from './listMotion'
import { useKeptScroll } from './useKeptScroll'

/**
 * Live card of a vehicle, person or instrument, shown in the left panel, in two parts. First its signals, each
 * worked right here (response steps, acknowledge, resolve); then,
 * under a full-width rule, its live data: freshness or reading, readings, depths, who is inside.
 * `view` is its outlet stack entry.
 */
const props = defineProps<{ detail: ObjectDetail; view?: OutletView }>()
const { snapshot, outlet } = useApp()
const scroller = ref<HTMLElement | null>(null)
useKeptScroll(scroller, () => props.view)
const d = computed(() => props.detail)
const followable = computed(() => FOLLOW_KINDS.includes(d.value.kind))

const kindLine = computed(() => {
  const kind = KIND_LABEL[d.value.kind]
  const sub = d.value.subtitle?.trim()
  if (!sub) return kind
  // a person's subtitle already starts with the role ("Surveyor, walking")
  if (d.value.kind === 'person') return sub
  return sub.toLowerCase().startsWith(kind.toLowerCase()) ? sub : `${kind}, ${sub}`
})

/*
 * Signals of this object, in a stable order: the ones open when the card opens in list order (new first,
 * then level), later arrivals on top. Working a signal (a tick, acknowledge, an escalation) never moves its
 * block, so the next click lands where the user expects. One resolved while the card is in the outlet stack
 * (by hand or because its condition cleared) stays in its place as a resolved line, also after a visit to
 * another card and back.
 */
const entry = props.view ? toRaw(props.view) : null
const places = reactive(entry ? (placesByEntry.get(entry) ?? new Map<string, number>()) : new Map<string, number>())
if (entry) placesByEntry.set(entry, toRaw(places))
watch(
  () => d.value.relatedSignalIds,
  (ids) => {
    const first = places.size === 0
    let top = Math.min(0, ...places.values())
    const ordered = snapshot.value.signalsActive.filter((s) => ids.includes(s.id))
    for (const s of ordered) if (!places.has(s.id)) places.set(s.id, first ? places.size : --top)
  },
  { immediate: true },
)
const concerns = (s: SignalView) => s.subject.id === d.value.id || s.involved.some((r) => r.id === d.value.id)
const related = computed(() => {
  const active = new Set(d.value.relatedSignalIds)
  const open = snapshot.value.signalsActive.filter((s) => active.has(s.id))
  // a reset reuses signal ids, so a kept id only counts while its signal still concerns this object
  const done = snapshot.value.signalsResolved.filter((s) => places.has(s.id) && !active.has(s.id) && concerns(s))
  const at = (s: SignalView) => places.get(s.id) ?? -Infinity
  return [...open, ...done].sort((a, b) => at(a) - at(b))
})


/*
 * One open signal is expanded at a time, so two or three still fit a 1280 x 720 screen. By default the
 * first open one; a header click picks another or folds them all. When the chosen one resolves, the next
 * open one takes over.
 */
const choice = ref<{ id: string | null } | null>(null)
const expandedId = computed(() => {
  const open = related.value.filter((s) => s.status !== 'resolved')
  const c = choice.value
  if (c && c.id === null) return null
  if (c && open.some((s) => s.id === c.id)) return c.id
  return open[0]?.id ?? null
})
const toggle = (id: string) => (choice.value = { id: expandedId.value === id ? null : id })

/* a block can leave on its own (a vehicle drives out of the zone): keep keyboard focus in the card */
function onBeforeLeave(el: Element) {
  pinLeaving(el)
  if (!el.contains(document.activeElement)) return
  nextTick(() => {
    const next = scroller.value?.querySelector<HTMLElement>('li:not(.signal-list-leave-active) [data-focus-fallback]') ?? scroller.value
    next?.focus({ preventScroll: true })
  })
}

const depthMax = computed(() => Math.max(1e-6, ...(d.value.depths ?? []).map((x) => Math.abs(x.value))))
</script>

<template>
  <article :aria-label="d.label" class="flex min-h-0 flex-col">
    <header class="flex shrink-0 items-start gap-3 px-4 pb-3 pt-1.5">
      <span :class="cn('flex size-10 shrink-0 items-center justify-center rounded-xl', TONE[d.level].soft)">
        <component :is="KIND_ICON[d.kind]" :size="18" />
      </span>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        <!-- no level tag: the level shows in the tinted icon square; screen readers get it as text -->
        <h2 class="truncate text-base font-semibold leading-tight tracking-[-0.01em]">
          {{ d.label }}<span class="sr-only">, {{ LEVEL_LABEL[d.level] }}</span>
        </h2>
        <p class="truncate text-xs text-muted-foreground">{{ kindLine }}</p>
      </div>
      <div v-if="followable" class="shrink-0 pt-1">
        <FollowToggle :id="d.id" :label="d.label" />
      </div>
    </header>

    <!-- tabindex: the last resort for keyboard focus when a signal block leaves (onBeforeLeave) -->
    <div
      ref="scroller"
      tabindex="-1"
      class="thin-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-4 outline-none"
    >
      <!-- part 1: the object's signals; the full-width rule and the Live data heading below set them apart -->
      <section v-if="related.length">
        <h3 class="mb-2 text-sm font-semibold tracking-[-0.01em] text-foreground">{{ UI.detail.related }}</h3>
        <TransitionGroup tag="ul" name="signal-list" class="relative flex flex-col gap-2" @before-leave="onBeforeLeave">
          <li v-for="s in related" :key="s.id">
            <ObjectSignal :signal="s" :object-id="d.id" :expanded="expandedId === s.id" @toggle="toggle(s.id)" />
          </li>
        </TransitionGroup>
      </section>

      <!-- part 2: the object itself, under a full-width rule when signals sit above it; freshness here when there is no reading block -->
      <div :class="cn('-mb-2 flex items-baseline justify-between gap-3', related.length > 0 && '-mx-4 border-t border-black/[0.08] px-4 pt-3')">
        <h3 class="text-sm font-semibold tracking-[-0.01em] text-foreground">{{ UI.detail.liveData }}</h3>
        <p v-if="!d.headline && !d.series" class="shrink-0 text-xs text-muted-foreground tabular-nums">{{ formatUpdated(d.updatedAgoS) }}</p>
      </div>

      <section v-if="d.headline || d.series" class="glass-element rounded-xl p-3.5">
        <ReadingBlock :detail="d" />
      </section>

      <section v-if="d.metrics.length">
        <h4 class="mb-1 text-xs font-medium text-muted-foreground">{{ UI.detail.readings }}</h4>
        <dl class="flex flex-col">
          <div
            v-for="m in d.metrics"
            :key="m.key"
            class="flex items-baseline justify-between gap-4 border-b border-black/[0.06] py-2 text-sm last:border-b-0"
          >
            <dt class="text-neutral-600">{{ m.label }}</dt>
            <dd :class="cn('text-right font-medium tabular-nums', m.level && m.level !== 'normal' && TONE[m.level].text)">
              {{ m.value }}<span v-if="m.unit" class="ml-1 font-normal text-muted-foreground">{{ m.unit }}</span>
            </dd>
          </div>
        </dl>
      </section>

      <section v-if="d.depths?.length">
        <Separator class="mb-3" />
        <h4 class="mb-2 text-xs font-medium text-muted-foreground">{{ UI.detail.depths }}</h4>
        <ul class="flex flex-col gap-1.5">
          <li v-for="r in d.depths" :key="r.depthM" class="flex items-center gap-2.5 text-xs tabular-nums">
            <span class="w-10 shrink-0 text-muted-foreground">{{ r.depthM }} {{ UI.detail.depthUnit }}</span>
            <span class="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
              <span
                :class="cn('block h-full rounded-full transition-[width] duration-500', TONE[r.level].solid)"
                :style="{ width: `${Math.max(2, (Math.abs(r.value) / depthMax) * 100)}%` }"
              />
            </span>
            <span :class="cn('w-16 shrink-0 text-right font-medium', r.level !== 'normal' && TONE[r.level].text)">
              {{ formatNumber(r.value, 1) }} {{ r.unit }}
            </span>
          </li>
        </ul>
      </section>

      <section v-if="d.zoneOccupants?.length">
        <Separator class="mb-3" />
        <h4 class="mb-1.5 text-xs font-medium text-muted-foreground">{{ UI.detail.occupants }}</h4>
        <ul class="flex flex-col gap-1">
          <li v-for="o in d.zoneOccupants" :key="o.id">
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
  </article>
</template>
