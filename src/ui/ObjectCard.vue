<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronRight } from 'lucide-vue-next'
import { FOLLOW_KINDS, type ObjectDetail, type SignalView } from '@/engine/contract'
import { useApp } from '@/engine/keys'
import type { OutletView } from '@/engine/outlet'
import { KIND_LABEL } from '@/config/copy'
import { LEVEL_LABEL } from '@/config/levels'
import { UI } from '@/config/uiCopy'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import FollowToggle from './FollowToggle.vue'
import ReadingBlock from './ReadingBlock.vue'
import { formatNumber, formatUpdated } from './format'
import { KIND_ICON } from './icons'
import { TONE, statusTone } from './tone'
import { useKeptScroll } from './useKeptScroll'

/** Live card of a vehicle, person or instrument, shown in the left panel. `view` is its outlet stack entry. */
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

const related = computed(() => {
  const ids = new Set(d.value.relatedSignalIds)
  if (!ids.size) return [] as SignalView[]
  return [...snapshot.value.signalsActive, ...snapshot.value.signalsResolved].filter((s) => ids.has(s.id))
})

const depthMax = computed(() => Math.max(1e-6, ...(d.value.depths ?? []).map((x) => Math.abs(x.value))))
</script>

<template>
  <article :aria-label="d.label" class="flex min-h-0 flex-col">
    <header class="flex shrink-0 items-start gap-3 px-4 pb-3 pt-1.5">
      <span :class="cn('flex size-10 shrink-0 items-center justify-center rounded-xl', TONE[d.level].soft)">
        <component :is="KIND_ICON[d.kind]" :size="18" />
      </span>
      <div class="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        <div class="flex items-center gap-2">
          <h2 class="truncate text-base font-semibold leading-tight tracking-[-0.01em]">{{ d.label }}</h2>
          <Badge :tone="d.level">{{ LEVEL_LABEL[d.level] }}</Badge>
        </div>
        <p class="truncate text-xs text-muted-foreground">{{ kindLine }}</p>
      </div>
      <div v-if="followable" class="shrink-0 pt-1">
        <FollowToggle :id="d.id" :label="d.label" />
      </div>
    </header>

    <div ref="scroller" class="thin-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-4">
      <section v-if="d.headline || d.series" class="glass-element rounded-xl p-3.5">
        <ReadingBlock :detail="d" />
      </section>
      <p v-else class="-mt-1 text-xs text-muted-foreground tabular-nums">{{ formatUpdated(d.updatedAgoS) }}</p>

      <section v-if="d.metrics.length">
        <h3 class="mb-1 text-xs font-medium text-muted-foreground">{{ UI.detail.readings }}</h3>
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
        <h3 class="mb-2 text-xs font-medium text-muted-foreground">{{ UI.detail.depths }}</h3>
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
        <h3 class="mb-1.5 text-xs font-medium text-muted-foreground">{{ UI.detail.occupants }}</h3>
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

      <section v-if="related.length">
        <Separator class="mb-3" />
        <h3 class="mb-1.5 text-xs font-medium text-muted-foreground">{{ UI.detail.related }}</h3>
        <ul class="flex flex-col gap-1">
          <li v-for="s in related" :key="s.id">
            <button
              type="button"
              class="flex w-full items-start gap-2.5 rounded-lg px-1.5 py-1.5 text-left text-sm outline-none hover:bg-black/[0.04] focus-visible:ring-2 focus-visible:ring-ring/70"
              @click="outlet.openSignal(s.id)"
            >
              <span :class="cn('mt-1.5 size-2 shrink-0 rounded-full', TONE[s.level].solid)" />
              <span class="min-w-0 flex-1 leading-snug">{{ s.title }}</span>
              <Badge :tone="statusTone(s)">{{ UI.signals.status[s.status] }}</Badge>
              <ChevronRight :size="14" class="mt-0.5 shrink-0 text-muted-foreground" />
            </button>
          </li>
        </ul>
      </section>
    </div>
  </article>
</template>
