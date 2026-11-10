/** en-GB formatters for the HUD. Locale is always passed explicitly. */
import { UI } from '@/config/uiCopy'

const LOCALE = 'en-GB'
const U = UI.time.unit

const clockFmt = new Intl.DateTimeFormat(LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** 24 h HH:mm:ss */
export function formatClock(epochMs: number): string {
  return clockFmt.format(epochMs)
}

/** "40 s", "2 min 40 s", "3 min", "1 h 5 min" */
export function formatDuration(totalS: number): string {
  const s = Math.max(0, Math.round(totalS))
  if (s < 60) return `${s} ${U.s}`
  if (s < 3600) {
    const m = Math.floor(s / 60)
    const r = s % 60
    return r ? `${m} ${U.min} ${r} ${U.s}` : `${m} ${U.min}`
  }
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return m ? `${h} ${U.h} ${m} ${U.min}` : `${h} ${U.h}`
}

/** coarse span for relative times: "45 s", "3 min", "2 h" */
function span(ageS: number): string {
  const s = Math.floor(ageS)
  if (s < 60) return `${s} ${U.s}`
  if (s < 3600) return `${Math.floor(s / 60)} ${U.min}`
  return `${Math.floor(s / 3600)} ${U.h}`
}

/** "Just now", "45 s ago", "3 min ago", "2 h ago" */
export function formatAgo(ageS: number): string {
  if (!Number.isFinite(ageS) || ageS < 10) return UI.time.justNow
  return UI.time.ago(span(ageS))
}

/** "Updated just now", "Updated 3 s ago" */
export function formatUpdated(ageS: number): string {
  if (!Number.isFinite(ageS) || ageS < 2) return UI.time.updatedNow
  return UI.time.updated(UI.time.ago(span(ageS)))
}

const numFmts = new Map<number, Intl.NumberFormat>()

export function formatNumber(n: number, digits = 0): string {
  let f = numFmts.get(digits)
  if (!f) {
    f = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits })
    numFmts.set(digits, f)
  }
  return f.format(n)
}

/** Parses a formatted number ("1,234.5", "-3.4") back to value and decimals, or null. */
export function parseNumber(s: string): { n: number; digits: number } | null {
  const clean = s.replace(/,/g, '').trim()
  if (!/^-?\d+(\.\d+)?$/.test(clean)) return null
  const dot = clean.indexOf('.')
  return { n: Number(clean), digits: dot < 0 ? 0 : clean.length - dot - 1 }
}
