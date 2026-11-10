import { LEVEL_RANK } from '@/config/levels'
import type { Level, LngLat, SensorKind, SignalType } from '@/engine/contract'
import { POINTS } from '@/data/geometry'
import { QUANTITY, type InstrumentDef, type Quantity } from '@/data/sensors'
import { toLocal, type Vec } from './geo'
import { gauss, type Rng } from './rng'
import { HISTORY_S, HISTORY_STEP, SERIES_CAP, Series, humpAt, pregenerate } from './series'

export const SAMPLE_EVERY = 3
export const OFFLINE_AFTER = 30
export const DWELL_S = 6

/** level with ~10% (of warn) hysteresis below each limit */
export function levelFor(v: number, q: Quantity, cur: Level): Level {
  if (q.warn === undefined || q.crit === undefined) return 'normal'
  const h = 0.1 * q.warn
  if (v >= q.crit || (cur === 'critical' && v > q.crit - h)) return 'critical'
  if (v >= q.warn || ((cur === 'warning' || cur === 'critical') && v > q.warn - h)) return 'warning'
  return 'normal'
}

export class Instrument {
  readonly def: InstrumentDef
  readonly id: string
  readonly kind: SensorKind
  readonly q: Quantity
  readonly lngLat: LngLat
  readonly pos: Vec
  readonly series: Series | null
  /** story-driven offset on top of base */
  drive = 0
  /** offset the world sets from events outside the stories (blast vibration on the seismograph) */
  extra = 0
  /** headline value (worst depth for inclinometers) */
  value: number
  channels: number[] = []
  level: Level
  lastAt: number
  private since = -Infinity
  private readonly ar: number[]

  constructor(def: InstrumentDef, rng: Rng) {
    this.def = def
    this.id = def.id
    this.kind = def.kind
    this.q = QUANTITY[def.kind]
    this.lngLat = POINTS[def.point]
    this.pos = toLocal(this.lngLat)
    const n = def.depths?.length ?? 1
    if (def.kind === 'totalStation') {
      this.series = null
      this.ar = [0]
    } else {
      this.series = new Series(SERIES_CAP)
      const end = def.silentFrom ?? 0
      const last = pregenerate(
        this.series,
        rng,
        def.sigma,
        (t) => this.historyBase(t),
        (t) => (def.gap !== undefined && t >= def.gap[0] && t < def.gap[1]) || t > end,
      )
      this.ar = new Array<number>(n).fill(last)
    }
    this.value = def.base + this.ar[0]
    this.channels = (def.depths ?? []).map((d) => def.base * d.factor + this.ar[0])
    this.level = levelFor(this.value, this.q, 'normal')
    this.lastAt = def.silentFrom ?? -HISTORY_STEP
  }

  private historyBase(t: number): number {
    const d = this.def
    const ramp = d.historyFrom === undefined ? 0 : (d.historyFrom - d.base) * Math.min(1, -t / HISTORY_S)
    return d.base + ramp + humpAt(d.humps, t)
  }

  get limitType(): SignalType | null {
    if (this.kind === 'piezometer') return 'pressureLimit'
    if (this.kind === 'inclinometer' || this.kind === 'prism' || this.kind === 'radar') return 'movementLimit'
    return null
  }

  sample(t: number, rng: Rng) {
    if (this.def.silentFrom !== undefined || this.lastAt === t) return
    this.lastAt = t
    if (!this.series) return
    const base = this.def.base + this.drive + this.extra
    const sig = this.def.sigma
    const ar = this.ar
    if (this.def.depths) {
      this.channels = this.def.depths.map((d, i) => {
        ar[i] = 0.85 * ar[i] + gauss(rng) * sig
        return Math.max(0.01, base * d.factor + ar[i])
      })
      this.value = Math.max(...this.channels)
    } else {
      ar[0] = 0.85 * ar[0] + gauss(rng) * sig
      this.value = Math.max(this.kind === 'seismic' ? 0.02 : 0, base + ar[0])
    }
    this.series.push(t, this.value)
    this.setLevel(levelFor(this.value, this.q, this.level === 'offline' ? 'normal' : this.level), t)
  }

  /** offline check, once per tick */
  refresh(t: number) {
    if (t - this.lastAt > OFFLINE_AFTER) this.setLevel('offline', t)
  }

  private setLevel(next: Level, t: number) {
    if (next === this.level) return
    const down = this.level !== 'offline' && next !== 'offline' && LEVEL_RANK[next] < LEVEL_RANK[this.level]
    if (down && t - this.since < DWELL_S) return
    this.level = next
    this.since = t
  }

  depthLevel(v: number): Level {
    return this.level === 'offline' ? 'offline' : levelFor(v, this.q, 'normal')
  }
}
