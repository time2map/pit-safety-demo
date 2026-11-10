import type { BlastPhase, Level, LngLat } from '@/engine/contract'
import { BLASTS, type BlastDef } from '@/data/blasts'
import { BENCH_STRIKE_DEG, POINTS, RADAR_AREA } from '@/data/geometry'
import type { Mobile } from './actors'
import { circlePolygon, distance, ellipsePolygon, offsetPolygon, pointInPolygon, rectPolygon, toLocal, toRing, type Vec } from './geo'
import type { Instrument } from './instruments'
import type { Rng } from './rng'

const ENTER_TICKS = 2
const EXIT_TICKS = 3
const EXIT_MARGIN = 10

/**
 * Debounced geofence: inside is confirmed after 2 consecutive ticks,
 * exit after 3 consecutive ticks outside a polygon grown by 10 m.
 */
export class Geofence {
  /** confirmed occupants, in actor order */
  inside: Mobile[] = []
  private readonly inN: number[]
  private readonly outN: number[]
  private readonly state: boolean[]
  private readonly hit: (p: Vec) => boolean
  private readonly hitExit: (p: Vec) => boolean
  private readonly applies: (m: Mobile) => boolean

  constructor(n: number, hit: (p: Vec) => boolean, hitExit: (p: Vec) => boolean, applies: (m: Mobile) => boolean) {
    this.inN = new Array<number>(n).fill(0)
    this.outN = new Array<number>(n).fill(0)
    this.state = new Array<boolean>(n).fill(false)
    this.hit = hit
    this.hitExit = hitExit
    this.applies = applies
  }

  update(actors: Mobile[]) {
    const inside: Mobile[] = []
    for (let i = 0; i < actors.length; i++) {
      const m = actors[i]
      if (!this.applies(m)) continue
      if (this.hit(m)) {
        this.outN[i] = 0
        if (++this.inN[i] >= ENTER_TICKS) this.state[i] = true
      } else {
        this.inN[i] = 0
        if (this.state[i]) {
          if (this.hitExit(m)) this.outN[i] = 0
          else if (++this.outN[i] >= EXIT_TICKS) this.state[i] = false
        }
      }
      if (this.state[i]) inside.push(m)
    }
    this.inside = inside
  }

  has(m: Mobile): boolean {
    return this.inside.includes(m)
  }
}

export class Zone {
  readonly id: string
  readonly kind: 'ground' | 'radar'
  readonly sensor: Instrument
  readonly label: string
  readonly place: string
  readonly ring: LngLat[]
  readonly fence: Geofence
  level: Level = 'normal'
  attention = false

  constructor(sensor: Instrument, kind: 'ground' | 'radar', poly: Vec[], nActors: number) {
    this.id = `${sensor.id}-zone`
    this.kind = kind
    this.sensor = sensor
    this.label = kind === 'ground' ? `${sensor.id} zone` : `${sensor.id} scan area`
    // the ground zone signal title already says "ground movement zone"
    this.place = kind === 'ground' ? sensor.def.place : `${sensor.def.place}, radar scan area`
    this.ring = toRing(poly)
    const exit = offsetPolygon(poly, EXIT_MARGIN)
    this.fence = new Geofence(
      nActors,
      (p) => pointInPolygon(p, poly),
      (p) => pointInPolygon(p, exit),
      () => true,
    )
  }
}

/**
 * Semi-axes (m) of a ground movement zone: along the bench strike and across it. Wells sit
 * 237 to 255 m apart along the strike, so the long axis stays short of touching the next zone
 * even with the edge noise (up to 12 %); across the strike there is no neighbour.
 */
const GROUND_ZONE = { along: 110, across: 88 }

/** ground movement zone per inclinometer well, plus the radar scan area */
export function buildZones(instruments: Instrument[], nActors: number, rng: Rng): Zone[] {
  const zones: Zone[] = []
  for (const s of instruments) {
    if (s.def.zone === 'ground') {
      const p = [rng(), rng(), rng()].map((v) => v * Math.PI * 2)
      const noise = (phi: number) =>
        1 + 0.06 * Math.sin(2 * phi + p[0]) + 0.04 * Math.sin(3 * phi + p[1]) + 0.02 * Math.sin(5 * phi + p[2])
      zones.push(new Zone(s, 'ground', ellipsePolygon(s.pos, GROUND_ZONE.along, GROUND_ZONE.across, BENCH_STRIKE_DEG, 48, noise), nActors))
    } else if (s.def.zone === 'radar') {
      zones.push(new Zone(s, 'radar', RADAR_AREA.map(toLocal), nActors))
    }
  }
  return zones
}

/* ------------------------------------------------------------------ */
/* Blasts                                                               */
/* ------------------------------------------------------------------ */

const FINAL_S = 60
const CLEAR_AFTER = 30
const RINGS_HIDE_AFTER = 50

export class Blast {
  readonly def: BlastDef
  readonly id: string
  readonly label: string
  readonly pos: Vec
  readonly lngLat: LngLat
  readonly block: LngLat[]
  readonly peopleRing: LngLat[]
  readonly vehicleRing: LngLat[]
  readonly people: Geofence
  readonly vehicles: Geofence
  phase: BlastPhase = 'scheduled'
  fireAt: number | null = null
  firedAt: number | null = null

  constructor(def: BlastDef, nActors: number) {
    this.def = def
    this.id = def.id
    this.label = def.label
    this.lngLat = POINTS[def.center]
    const c = toLocal(this.lngLat)
    this.pos = c
    this.block = toRing(rectPolygon(c, def.length, def.width, BENCH_STRIKE_DEG))
    this.peopleRing = toRing(circlePolygon(c, def.peopleRadius))
    this.vehicleRing = toRing(circlePolygon(c, def.vehicleRadius))
    const ring = (r: number) => (p: Vec) => distance(p, c) <= r
    this.people = new Geofence(nActors, ring(def.peopleRadius), ring(def.peopleRadius + EXIT_MARGIN), (m) => m.category === 'person')
    this.vehicles = new Geofence(nActors, ring(def.vehicleRadius), ring(def.vehicleRadius + EXIT_MARGIN), (m) => m.category === 'vehicle')
  }

  arm(t: number, fireIn: number) {
    this.phase = 'armed'
    this.fireAt = t + fireIn
  }

  reset() {
    this.phase = 'scheduled'
    this.fireAt = null
  }

  /** advances the phase; returns true on the tick it fires */
  tick(t: number): boolean {
    const f = this.fireAt
    if (f === null) return false
    if (this.phase === 'armed' && t >= f - FINAL_S) this.phase = 'final'
    if (this.phase === 'final' && t >= f) {
      this.phase = 'fired'
      this.firedAt = t
      return true
    }
    if (this.phase === 'fired' && t >= f + CLEAR_AFTER) this.phase = 'clear'
    if (this.phase === 'clear' && t >= f + RINGS_HIDE_AFTER) this.reset()
    return false
  }

  /** exclusion is enforced */
  get live(): boolean {
    return this.phase === 'armed' || this.phase === 'final' || this.phase === 'fired'
  }

  get ringsVisible(): boolean {
    return this.phase !== 'scheduled'
  }

  get level(): Level {
    return this.phase === 'armed' ? 'warning' : this.phase === 'final' || this.phase === 'fired' ? 'critical' : 'normal'
  }

  occupants(): Mobile[] {
    return [...this.people.inside, ...this.vehicles.inside]
  }
}

export const buildBlasts = (nActors: number) => BLASTS.map((d) => new Blast(d, nActors))
