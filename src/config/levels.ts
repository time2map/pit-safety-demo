import type { Level } from '@/engine/contract'

/**
 * Status palette. Tailwind-based tones that match the AI lib style guide.
 * Map colours for the WebGL zone, blast and ripple layers; pins, badges and the panels use the
 * --lv-* CSS variables in styles/app.css (keep the hex values in step).
 */
export const LEVEL_COLOR: Record<Level, { map: string }> = {
  critical: { map: '#dc2626' },
  warning: { map: '#eab308' },
  normal: { map: '#16a34a' },
  offline: { map: '#64748b' },
}

export const LEVEL_LABEL: Record<Level, string> = {
  critical: 'Critical',
  warning: 'Warning',
  normal: 'Normal',
  offline: 'Offline',
}

/** Higher is more severe. */
export const LEVEL_RANK: Record<Level, number> = { normal: 0, offline: 1, warning: 2, critical: 3 }

export function worst(a: Level, b: Level): Level {
  return LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b
}
