/** Literal Tailwind classes per status level (kept literal so Tailwind can see them). */
import type { Level, SignalView } from '@/engine/contract'

/** Badge tone for a signal's lifecycle status: new takes the level colour, acknowledged is neutral, resolved green. */
export function statusTone(s: Pick<SignalView, 'status' | 'level'>): Level | 'neutral' {
  return s.status === 'new' ? s.level : s.status === 'resolved' ? 'normal' : 'neutral'
}

export interface Tone {
  /** tinted pill or tile: bg + fg */
  soft: string
  /** solid colour dot or bar */
  solid: string
  /** coloured text */
  text: string
}

export const TONE: Record<Level, Tone> = {
  critical: { soft: 'bg-lv-critical-bg text-lv-critical-fg', solid: 'bg-lv-critical', text: 'text-lv-critical-fg' },
  warning: { soft: 'bg-lv-warning-bg text-lv-warning-fg', solid: 'bg-lv-warning', text: 'text-lv-warning-fg' },
  normal: { soft: 'bg-lv-normal-bg text-lv-normal-fg', solid: 'bg-lv-normal', text: 'text-lv-normal-fg' },
  offline: { soft: 'bg-lv-offline-bg text-lv-offline-fg', solid: 'bg-lv-offline', text: 'text-lv-offline-fg' },
}

/** CSS variable for SVG fills and strokes */
export const LEVEL_VAR: Record<Level, string> = {
  critical: 'var(--lv-critical)',
  warning: 'var(--lv-warning)',
  normal: 'var(--lv-normal)',
  offline: 'var(--lv-offline)',
}
