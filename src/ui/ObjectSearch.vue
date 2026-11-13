<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { Search, X } from 'lucide-vue-next'
import { useApp } from '@/engine/keys'
import { LEVEL_LABEL } from '@/config/levels'
import { UI } from '@/config/uiCopy'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { KIND_ICON } from './icons'
import { searchObjects } from './search'
import { panelNav, searchInput } from './searchFocus'
import { TONE } from './tone'

/**
 * Object search, the second row of the product bar (BrandHeader.vue): type an id, a name, a kind or a place,
 * pick a result with the mouse or the arrow keys and Enter, and its card opens like a click on its pin, with
 * the map centred on it. A combobox with a list box (aria-activedescendant), so focus stays in the input.
 * / or Ctrl+K puts the cursor here (useHotkeys), Escape clears and then leaves. The result list is placed
 * against the product bar (the nearest positioned box), so it spans the bar's full width under it.
 */
const LIMIT = 8
const { snapshot, outlet } = useApp()

const root = ref<HTMLElement | null>(null)
const input = ref<HTMLInputElement | null>(null)
const query = ref('')
const focused = ref(false)

const open = computed(() => focused.value && query.value.trim().length > 0)
/* only while the list is open: the snapshot ticks twice a second */
const result = computed(() => (open.value ? searchObjects(snapshot.value.objects, query.value, LIMIT) : { hits: [], more: 0 }))
const hits = computed(() => result.value.hits)

/*
 * The highlighted row is tracked by object, not by position: the list follows the live snapshot and can
 * re-sort under the pointer, and Enter must open the object the user sees highlighted. Gone from the
 * list, the first row takes over.
 */
const activeId = ref<string | null>(null)
const active = computed(() => Math.max(0, hits.value.findIndex((h) => h.object.id === activeId.value)))
watch(query, () => (activeId.value = null))

/* the count for screen readers changes with what the user types, not with every snapshot tick */
const status = ref('')
watch([query, open], () => {
  status.value = open.value ? UI.search.count(result.value.hits.length + result.value.more) : ''
})

const listId = `search-list-${useId()}`
const optionId = (i: number) => `${listId}-${i}`

watch(input, (el) => (searchInput.value = el), { immediate: true })
onBeforeUnmount(() => {
  if (searchInput.value === input.value) searchInput.value = null
})

/* a pick with Enter hands keyboard focus to the panel's back button, as a card opened inside the panel does */
function pick(id: string, byKeyboard = false) {
  outlet.find(id)
  query.value = ''
  if (!byKeyboard) {
    input.value?.blur()
    return
  }
  nextTick(() => {
    const back = panelNav.value?.querySelector<HTMLElement>('button')
    if (back) back.focus({ preventScroll: true })
    else input.value?.blur()
  })
}

function move(by: number) {
  const n = hits.value.length
  if (!n) return
  const next = (active.value + by + n) % n
  activeId.value = hits.value[next]!.object.id
  document.getElementById(optionId(next))?.scrollIntoView({ block: 'nearest' })
}

function onKeydown(e: KeyboardEvent) {
  // typing means the field has focus, even where the browser sent no focus event (a background window)
  focused.value = true
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    move(1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    move(-1)
  } else if (e.key === 'Enter') {
    const hit = hits.value[active.value]
    if (open.value && hit) {
      e.preventDefault()
      pick(hit.object.id, true)
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    if (query.value) query.value = ''
    else input.value?.blur()
  }
}

function onFocusOut(e: FocusEvent) {
  const next = e.relatedTarget as Node | null
  if (!next || !root.value?.contains(next)) focused.value = false
}

function clear() {
  query.value = ''
  input.value?.focus()
}

/* a press anywhere in the search but the input (the pill, the list frame, a note) keeps focus in the input, so the list stays open */
function onMousedown(e: MouseEvent) {
  if (e.target === input.value) return
  e.preventDefault()
  input.value?.focus()
}
</script>

<template>
  <div ref="root" role="search" class="px-2 pb-2" @focusout="onFocusOut" @mousedown="onMousedown">
    <div
      :class="
        cn(
          'flex h-9 items-center gap-2 rounded-full bg-black/[0.045] pl-3 pr-1 transition-[background-color,box-shadow]',
          focused && 'bg-white/80 ring-2 ring-ring/40',
        )
      "
    >
      <Search :size="16" class="shrink-0 text-muted-foreground" aria-hidden="true" />
      <input
        ref="input"
        v-model="query"
        type="text"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        aria-autocomplete="list"
        :aria-label="UI.search.label"
        :aria-expanded="open && hits.length > 0"
        :aria-controls="open && hits.length ? listId : undefined"
        :aria-activedescendant="open && hits.length ? optionId(active) : undefined"
        :placeholder="UI.search.placeholder"
        maxlength="64"
        class="h-full min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        @focus="focused = true"
        @input="focused = true"
        @keydown="onKeydown"
      />
      <kbd
        v-if="!query"
        aria-hidden="true"
        class="mr-1.5 rounded-md bg-black/[0.06] px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground"
        >/</kbd
      >
      <!-- out of the tab order, as usual for a combobox clear button: Escape in the input clears as well -->
      <button
        v-else
        type="button"
        tabindex="-1"
        :aria-label="UI.search.clear"
        class="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-black/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/70"
        @click="clear"
      >
        <X :size="14" aria-hidden="true" />
      </button>
    </div>

    <!-- what the results are, for screen readers; the list itself is read through aria-activedescendant -->
    <p class="sr-only" role="status">{{ status }}</p>

    <!-- a solid sheet, not glass: it opens over the signal list, whose text would show through -->
    <div
      v-if="open"
      class="absolute inset-x-0 top-full mt-2 overflow-hidden rounded-2xl border border-black/[0.06] bg-white p-1.5 shadow-[0_16px_40px_rgb(0_0_0/0.18),0_2px_6px_rgb(0_0_0/0.08)]"
    >
      <ul v-if="hits.length" :id="listId" role="listbox" :aria-label="UI.search.results" class="thin-scroll max-h-[min(440px,60vh)] overflow-y-auto">
        <li
          v-for="(h, i) in hits"
          :id="optionId(i)"
          :key="h.object.id"
          role="option"
          :aria-selected="i === active"
          :class="cn('flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2', i === active && 'bg-black/[0.05]')"
          @mousemove="activeId = h.object.id"
          @click="pick(h.object.id)"
        >
          <span :class="cn('flex size-8 shrink-0 items-center justify-center rounded-lg', TONE[h.object.level].soft)" aria-hidden="true">
            <component :is="KIND_ICON[h.object.kind]" :size="16" />
          </span>
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="truncate text-sm font-medium text-foreground">
              <template v-for="(part, k) in h.label" :key="k">
                <mark v-if="part.hit" class="bg-transparent font-semibold text-inherit underline decoration-current/40 underline-offset-2">{{ part.text }}</mark>
                <template v-else>{{ part.text }}</template>
              </template>
            </span>
            <span class="truncate text-xs text-muted-foreground">{{ h.detail }}</span>
          </span>
          <Badge v-if="h.object.level !== 'normal'" :tone="h.object.level">{{ LEVEL_LABEL[h.object.level] }}</Badge>
        </li>
      </ul>
      <p v-if="result.more" class="px-2.5 pb-1 pt-1.5 text-xs text-muted-foreground">{{ UI.search.more(result.more) }}</p>
      <p v-if="!hits.length" class="px-2.5 py-2 text-sm text-muted-foreground">{{ UI.search.empty }}</p>
    </div>
  </div>
</template>
