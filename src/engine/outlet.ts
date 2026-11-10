/**
 * Navigation inside the left panel. The signal list sits at the bottom; signal and
 * object cards stack above it, and the top card is the one shown. The map selection
 * always follows the top card: a signal card selects its subject, an object card its object.
 * Opening a card centres the map on it; stepping back only moves the selection.
 * Pure logic with injected selection calls, so it can be tested without a map.
 */
import { reactive } from 'vue'

export type OutletView = { kind: 'signal'; id: string } | { kind: 'object'; id: string }

export interface Outlet {
  /** cards above the signal list, last one is shown; empty shows the list (reactive) */
  readonly stack: readonly OutletView[]
  /** open a signal card and centre the map on its subject */
  openSignal(id: string): void
  /** open an object card from inside the panel and centre the map on it */
  openObject(id: string): void
  /** a click on the map: an object opens its card in place of an object card on top and the map centres on it, empty map closes that card */
  mapPick(id: string | null): void
  /** one step back; the list is the last step */
  back(): void
  /** straight back to the signal list */
  home(): void
}

export interface OutletDeps {
  /** map selection without moving the camera */
  select(id: string | null): void
  /** map selection and a camera move to the object */
  focus(id: string): void
  /** subject object of a listed signal, null when the signal is not listed */
  subjectOf(signalId: string): string | null
}

/** Deep enough for list, signal, object, related signal; older cards drop off the bottom. */
export const MAX_DEPTH = 4

export function createOutlet(deps: OutletDeps): Outlet & { clear(): void } {
  const state = reactive({ stack: [] as OutletView[] })

  const top = (): OutletView | undefined => state.stack[state.stack.length - 1]

  function targetOf(v: OutletView | undefined): string | null {
    if (!v) return null
    return v.kind === 'object' ? v.id : deps.subjectOf(v.id)
  }

  function sync(fly: boolean) {
    const id = targetOf(top())
    if (fly && id) deps.focus(id)
    else deps.select(id)
  }

  function open(view: OutletView, replaceObject: boolean) {
    const s = state.stack
    const at = s.findIndex((v) => v.kind === view.kind && v.id === view.id)
    if (at >= 0) {
      // already open further down: step back to it instead of stacking a copy
      s.splice(at + 1)
    } else {
      if (replaceObject && top()?.kind === 'object') s.pop()
      s.push(view)
      if (s.length > MAX_DEPTH) s.splice(0, s.length - MAX_DEPTH)
    }
    sync(true)
  }

  function back() {
    if (!state.stack.length) return
    state.stack.pop()
    sync(false)
  }

  return {
    get stack() {
      return state.stack
    },
    openSignal(id) {
      open({ kind: 'signal', id }, false)
    },
    openObject(id) {
      open({ kind: 'object', id }, false)
    },
    mapPick(id) {
      if (id) open({ kind: 'object', id }, true)
      else if (top()?.kind === 'object') back()
    },
    back,
    home() {
      state.stack.splice(0)
      deps.select(null)
    },
    clear() {
      state.stack.splice(0)
    },
  }
}
