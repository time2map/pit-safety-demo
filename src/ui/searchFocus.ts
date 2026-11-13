import { shallowRef } from 'vue'

/** The object search input, so the hotkeys (/ and Ctrl+K) can put the cursor in it. Set by ObjectSearch.vue. */
export const searchInput = shallowRef<HTMLInputElement | null>(null)

/** The card navigation of the left panel (its back button first), where focus goes after a search pick with Enter. Set by SignalsOutlet.vue. */
export const panelNav = shallowRef<HTMLElement | null>(null)

export function focusSearch() {
  const el = searchInput.value
  if (!el) return
  el.focus()
  el.select()
}
