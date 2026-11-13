import { useEventListener } from '@vueuse/core'
import { FOLLOW_KINDS, type StoryId } from '@/engine/contract'
import type { AppContext } from '@/engine/keys'
import { focusSearch } from './searchFocus'

/* physical keys (e.code), so the shortcuts work on any keyboard layout */
const STORY_BY_CODE: Record<string, StoryId> = {
  Digit1: 'ground',
  Digit2: 'blast',
  Digit3: 'fire',
  Digit4: 'seismic',
  Numpad1: 'ground',
  Numpad2: 'blast',
  Numpad3: 'fire',
  Numpad4: 'seismic',
}
const STORY_BY_KEY: Record<string, StoryId> = { '1': 'ground', '2': 'blast', '3': 'fire', '4': 'seismic' }

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  if (el.isContentEditable) return true
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}

/**
 * Space play/pause, 1 to 4 stories (ignored during autoplay, like the locked buttons), R reset, H dock,
 * F follow the selected vehicle or person, / or Ctrl+K the object search, Escape back in the left panel.
 * Matched by physical key, so R, H and F work on any keyboard layout.
 * Space on a control focused by keyboard keeps its native meaning; on a control
 * focused by a mouse click it blurs the control and toggles pause instead.
 */
export function useHotkeys(ctx: AppContext) {
  useEventListener('keydown', (e: KeyboardEvent) => {
    // Ctrl+K (Cmd+K) jumps to the search from anywhere, the search box included
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.code === 'KeyK') {
      e.preventDefault()
      focusSearch()
      return
    }
    if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
    const el = e.target instanceof HTMLElement ? e.target : null
    const onControl = !!el && el !== document.body && !!el.closest('button,[role="button"],[role="switch"],[role="checkbox"],[role="radio"],a')

    if (e.code === 'Space' || e.key === ' ') {
      if (onControl && el!.matches(':focus-visible')) return
      e.preventDefault()
      if (e.repeat) return
      if (onControl) el!.blur()
      ctx.commands.togglePause()
      return
    }
    if (e.repeat) return

    const story = STORY_BY_CODE[e.code] ?? STORY_BY_KEY[e.key]
    if (story) {
      if (!ctx.snapshot.value.autoplay) ctx.commands.triggerStory(story)
    } else if (e.code === 'Slash' || e.key === '/') {
      e.preventDefault()
      focusSearch()
    } else if (e.code === 'KeyR') {
      ctx.commands.reset()
    } else if (e.code === 'KeyH') {
      ctx.dockVisible.value = !ctx.dockVisible.value
    } else if (e.code === 'KeyF') {
      // follow the selected vehicle or person, or let the camera go
      const s = ctx.snapshot.value
      if (s.following) ctx.commands.follow(null)
      else if (s.selected && FOLLOW_KINDS.includes(s.selected.kind)) ctx.commands.follow(s.selected.id)
    } else if (e.code === 'Escape' || e.key === 'Escape') {
      // let open popovers and dialogs close first
      if (e.defaultPrevented || el?.closest('[data-reka-popper-content-wrapper],[role="dialog"]')) return
      // one step back in the left panel: card to the card underneath, last card to the signal list
      ctx.outlet.back()
    }
  })
}
