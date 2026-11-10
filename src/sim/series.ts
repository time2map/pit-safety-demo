import type { Hump } from '@/data/fleet'
import { gauss, type Rng } from './rng'

/** Fixed capacity ring buffer of (t, v) samples. */
export class Series {
  private readonly ts: Float64Array
  private readonly vs: Float64Array
  private head = 0
  size = 0

  constructor(cap: number) {
    this.ts = new Float64Array(cap)
    this.vs = new Float64Array(cap)
  }

  push(t: number, v: number) {
    const cap = this.ts.length
    this.ts[this.head] = t
    this.vs[this.head] = v
    this.head = (this.head + 1) % cap
    if (this.size < cap) this.size++
  }

  /** samples with t >= from, oldest first */
  view(from: number): { t: number[]; v: number[] } {
    const cap = this.ts.length
    const t: number[] = []
    const v: number[] = []
    for (let k = this.size; k > 0; k--) {
      const i = (this.head - k + cap) % cap
      if (this.ts[i] >= from) {
        t.push(this.ts[i])
        v.push(Math.round(this.vs[i] * 1000) / 1000)
      }
    }
    return { t, v }
  }
}

export const HISTORY_S = 3600
export const HISTORY_STEP = 30
/** 60 min of history at 30 s plus 60 min of live samples at 3 s */
export const SERIES_CAP = HISTORY_S / HISTORY_STEP + 1200 + 20

export function humpAt(humps: Hump[] | undefined, t: number): number {
  let v = 0
  if (humps) for (const h of humps) if (t > h.from && t < h.to) v += h.amp * Math.sin((Math.PI * (t - h.from)) / (h.to - h.from))
  return v
}

/**
 * Fills the hour before t = 0 with an AR(1) process around shape(t).
 * Returns the final AR state so live sampling continues smoothly.
 */
export function pregenerate(
  s: Series,
  rng: Rng,
  sigma: number,
  shape: (t: number) => number,
  skip?: (t: number) => boolean,
): number {
  let ar = 0
  for (let t = -HISTORY_S; t < 0; t += HISTORY_STEP) {
    ar = 0.85 * ar + gauss(rng) * sigma
    if (!skip?.(t)) s.push(t, shape(t) + ar)
  }
  return ar
}
