<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { ChevronLeft, X } from 'lucide-vue-next'
import { useApp } from '@/engine/keys'
import { UI } from '@/config/uiCopy'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import IconButton from './IconButton.vue'
import ObjectCard from './ObjectCard.vue'
import { panelNav } from './searchFocus'
import SignalCard from './SignalCard.vue'
import SignalList from './SignalList.vue'

/**
 * The single left panel. Shows the signal list, or the card on top of the outlet stack
 * (a signal or an object) with a way back. The list stays mounted underneath, so its
 * filter and scroll position survive a trip into a card.
 */
const { snapshot, outlet } = useApp()

const depth = computed(() => outlet.stack.length)
const top = computed(() => outlet.stack[depth.value - 1] ?? null)
const prev = computed(() => outlet.stack[depth.value - 2] ?? null)

const signal = computed(() => {
  const t = top.value
  if (t?.kind !== 'signal') return null
  const s = snapshot.value
  return s.signalsActive.find((x) => x.id === t.id) ?? s.signalsResolved.find((x) => x.id === t.id) ?? null
})
/* the map selection follows the top card, so the selected detail is the signal subject or the open object */
const subjectDetail = computed(() => {
  const sel = snapshot.value.selected
  return signal.value && sel && sel.id === signal.value.subject.id ? sel : null
})
const objectDetail = computed(() => (top.value?.kind === 'object' ? snapshot.value.selected : null))

/* the back button names where it leads: the list, the signal underneath, or the object underneath */
const back = computed(() => {
  const p = prev.value
  if (!p) return { label: UI.signals.title, hint: UI.outlet.toList }
  if (p.kind === 'signal') return { label: UI.outlet.signal, hint: UI.outlet.toSignal }
  const label = snapshot.value.objects.find((o) => o.id === p.id)?.label
  return label ? { label, hint: UI.outlet.backTo(label) } : { label: UI.outlet.back, hint: UI.outlet.back }
})

/* a card with nothing to show (signal dropped from the lists, object without details) steps back */
watch([top, signal, objectDetail], ([t, s, o]) => {
  if (!t) return
  if ((t.kind === 'signal' && !s) || (t.kind === 'object' && !o)) outlet.back()
})

/*
 * Keep keyboard focus inside the panel while moving between views: the row or button that
 * had focus disappears, so focus goes to the back button, and back on the list to the row
 * that opened the card. The first row (or the list filter) takes it instead when that signal
 * has left the list (say resolved in its card) or was acknowledged there: new signals sort
 * first, so the acknowledged row has dropped down and the top row is the next one to handle.
 * Only when focus was already in the panel, so map clicks, toasts and the Space pause hotkey
 * are left alone.
 */
const root = ref<HTMLElement | null>(null)
const nav = ref<HTMLElement | null>(null)
watch(nav, (el) => (panelNav.value = el))
let openedFrom: string | null = null
let openedNew = false
const statusOf = (id: string) => snapshot.value.signalsActive.find((x) => x.id === id)?.status
watch(top, async (t, old) => {
  if (!old) {
    openedFrom = t?.kind === 'signal' ? t.id : null
    openedNew = !!openedFrom && statusOf(openedFrom) === 'new'
  }
  const active = document.activeElement
  if (!active || active === document.body || !root.value?.contains(active)) return
  await nextTick()
  if (t) {
    nav.value?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true })
    return
  }
  // rows still on the list; a row that is fading out after leaving it does not count
  const row = (sel: string) => root.value?.querySelector<HTMLElement>(`li:not(.signal-list-leave-active) ${sel}`)
  const handled = !!openedFrom && openedNew && statusOf(openedFrom) !== 'new'
  const target =
    (openedFrom && !handled && row(`[data-signal-id="${CSS.escape(openedFrom)}"]`)) ||
    row('[data-signal-id]') ||
    root.value?.querySelector<HTMLElement>('[role="group"] button')
  target?.focus({ preventScroll: true })
  // the list may have re-sorted while the card was open, so make sure the row is in view
  if (target?.hasAttribute('data-signal-id')) target.scrollIntoView({ block: 'nearest' })
})
</script>

<template>
  <section ref="root" :aria-label="UI.signals.title" class="glass-floating flex min-h-0 flex-col overflow-hidden rounded-3xl">
    <SignalList v-show="!top" class="min-h-0 flex-1" />

    <template v-if="top">
      <nav ref="nav" :aria-label="UI.outlet.nav" class="flex shrink-0 items-center justify-between gap-2 px-2.5 pt-2.5">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button variant="ghost" size="xs" class="min-w-0 gap-0.5 pl-1.5 pr-2.5 text-muted-foreground hover:text-foreground" @click="outlet.back()">
              <ChevronLeft :size="16" aria-hidden="true" />
              <span class="truncate">{{ back.label }}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {{ back.hint }}
            <kbd class="rounded-md bg-black/5 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">Esc</kbd>
          </TooltipContent>
        </Tooltip>
        <IconButton v-if="depth > 1" :icon="X" :label="UI.outlet.closeAll" side="bottom" size="icon-xs" @click="outlet.home()" />
      </nav>

      <!-- appear: the first card mounts together with this block when it opens from the list -->
      <Transition
        appear
        mode="out-in"
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-x-2"
        leave-active-class="transition duration-100 ease-in"
        leave-to-class="opacity-0"
      >
        <SignalCard v-if="signal" :key="`s:${signal.id}`" :signal="signal" :subject="subjectDetail" :view="top" class="min-h-0 flex-1" />
        <ObjectCard v-else-if="objectDetail" :key="`o:${top.id}`" :detail="objectDetail" :view="top" class="min-h-0 flex-1" />
      </Transition>
    </template>
  </section>
</template>
