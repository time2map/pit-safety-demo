import { onBeforeUnmount, onMounted, toRaw, type Ref } from 'vue'

/* scroll offsets per outlet stack entry; entries are dropped from the stack on back, home and reset, so stale ones are collected */
const tops = new WeakMap<object, number>()

/**
 * Remembers a card's scroll position for its entry in the outlet stack, so stepping back
 * to a card (signal, then an involved object, then back) lands where the user left it.
 * A fresh open is a new entry and starts at the top.
 */
export function useKeptScroll(el: Ref<HTMLElement | null>, entry: () => object | undefined) {
  onMounted(() => {
    const key = entry()
    if (el.value && key) el.value.scrollTop = tops.get(toRaw(key)) ?? 0
  })
  onBeforeUnmount(() => {
    const key = entry()
    if (el.value && key) tops.set(toRaw(key), el.value.scrollTop)
  })
}
