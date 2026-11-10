/**
 * Moving things: haul trucks, auxiliary equipment, people, and the reserved story actors.
 * Everything advances in fixed steps; positions are in the local metric frame.
 */
import type { Level, LngLat, ObjectRef, VehicleKind } from '@/engine/contract'
import { AREA_LABEL, type AreaId, type HaulRoute, type PersonDef, type TruckDef, type VehicleDef } from '@/data/fleet'
import { BENCH_STRIKE_DEG, PEOPLE_AREAS, ROUTES } from '@/data/geometry'
import { Path, clamp, toLngLat, toLocal, type PathPoint, type Vec } from './geo'
import { gauss, range, type Rng } from './rng'
import { SERIES_CAP, Series, humpAt, pregenerate } from './series'

/** things move this many times faster than their displayed speed, so motion reads on an overview zoom */
export const MOVE_SCALE = 1.5
const ACCEL = 2 * MOVE_SCALE
const LANE = 4
/** lateral metres per metre travelled when changing lanes */
const LANE_SLOPE = 0.3
const WALK = 1.3 * MOVE_SCALE

export const TEMP_WARN = 105
export const TEMP_CRIT = 115
const STOP_GAP = 25
const FOLLOW_GAP = 60
const PULL = 10
const DUMP_BACKOFF: Record<HaulRoute, number> = { haulA: 25, haulB: 18, haulC: 0 }
const PHASE_TEMP = { loading: 82, hauling: 86, dumping: 84, returning: 80 }

export type ActorKind = VehicleKind | 'person'

export interface PersonInfo {
  role: string
  battery: number
  area: string
}

export abstract class Mobile {
  readonly id: string
  readonly label: string
  abstract readonly kind: ActorKind
  x = 0
  y = 0
  /** moved metres per second (MOVE_SCALE times the displayed speed) */
  speed = 0
  /** own condition before signal involvement */
  status: Level = 'normal'
  /** status combined with the signals the actor is involved in */
  level: Level = 'normal'
  operator = ''
  person: PersonInfo | null = null

  constructor(id: string, label: string) {
    this.id = id
    this.label = label
  }

  get category(): 'vehicle' | 'person' {
    return this.kind === 'person' ? 'person' : 'vehicle'
  }
  get ref(): ObjectRef {
    return { id: this.id, label: this.label, kind: this.kind }
  }
  get kmh(): number {
    return (this.speed / MOVE_SCALE) * 3.6
  }
  get moving(): boolean {
    return this.speed > 0.1
  }
  get lngLat(): LngLat {
    return toLngLat(this)
  }

  abstract state(): string
  abstract update(dt: number, t: number): void
}

const P0: PathPoint = { x: 0, y: 0, seg: 0 }
const P1: PathPoint = { x: 0, y: 0, seg: 0 }
const P2: PathPoint = { x: 0, y: 0, seg: 0 }

/** distance-based position on a path with a segment hint */
export class Rider {
  readonly path: Path
  s = 0
  seg = 0

  constructor(path: Path) {
    this.path = path
  }
  get length() {
    return this.path.length
  }

  /** puts m at s with a lateral offset (positive = left of the path direction, from a 5 m look-ahead) */
  place(m: Mobile, lane: number) {
    const p = this.path.at(this.s, this.seg, P0)
    this.seg = p.seg
    const a = this.path.at(this.s + 5, this.seg, P1)
    const b = this.path.at(this.s - 5, this.seg, P2)
    let tx = a.x - b.x
    let ty = a.y - b.y
    const l = Math.hypot(tx, ty) || 1
    tx /= l
    ty /= l
    m.x = p.x - ty * lane
    m.y = p.y + tx * lane
  }

  /** moves toward target s, braking to stop on it; true on arrival */
  drive(m: Mobile, target: number, cruise: number, limit: number, dt: number): boolean {
    const d = target - this.s
    const dist = Math.abs(d)
    if (dist < 0.05) {
      this.s = target
      m.speed = 0
      return true
    }
    const v = Math.min(cruise, Math.sqrt(2 * ACCEL * dist), limit)
    m.speed = v < m.speed ? v : Math.min(v, m.speed + ACCEL * dt)
    this.s += Math.sign(d) * Math.min(dist, m.speed * dt)
    return false
  }
}

function easeLane(lane: number, target: number, m: Mobile, dt: number): number {
  const k = LANE_SLOPE * m.speed * dt
  return lane + clamp(target - lane, -k, k)
}

/* ------------------------------------------------------------------ */
/* Haul trucks                                                          */
/* ------------------------------------------------------------------ */

export type TruckPhase = 'loading' | 'hauling' | 'dumping' | 'returning'
export type FireState = 'none' | 'burning' | 'out'

export class Truck extends Mobile {
  readonly kind = 'haulTruck' as const
  readonly def: TruckDef
  readonly route: HaulRoute
  readonly rider: Rider
  /** where the truck stops to dump, slightly before the route end so routes sharing a dump do not overlap */
  readonly stopS: number
  readonly series: Series
  phase: TruckPhase = 'loading'
  /** 1 toward the dump, -1 toward the face */
  dir = -1
  lane = LANE
  cruise = 0
  /** max speed allowed by car following, set before each step */
  limit = Infinity
  payload = 0
  payloadTarget = 180
  temp = 83
  forcedTemp: number | null = null
  fuel: number
  suppression: 'ready' | 'fault' | 'released'
  fire: FireState = 'none'
  /** extra side offset while pulled over */
  pull = 0
  private timer = 0
  private dur = 50
  private brake = 0
  private tempSmooth = 83
  private tempAr: number
  private readonly rng: Rng

  constructor(def: TruckDef, rng: Rng, u: number) {
    super(def.id, def.id)
    this.def = def
    this.route = def.route
    this.operator = def.operator
    this.rng = rng
    this.rider = new Rider(Path.of(ROUTES[def.route]))
    this.stopS = this.rider.length - DUMP_BACKOFF[def.route]
    this.suppression = def.suppression ?? 'ready'
    this.fuel = range(rng, 35, 95)
    this.series = new Series(SERIES_CAP)
    this.tempAr = pregenerate(this.series, rng, 0.6, (t) => 83 + humpAt(def.tempHumps, t))
    this.initPhase(u)
    this.place()
  }

  /** spreads trucks over the cycle: u in [0, 1) */
  private initPhase(u: number) {
    const r = this.rng
    this.payloadTarget = range(r, 150, 220)
    if (u < 0.2) {
      this.setPhase('loading')
      this.timer = (u / 0.2) * this.dur * 0.8
      this.payload = (this.payloadTarget * this.timer) / this.dur
    } else if (u < 0.55) {
      this.setPhase('hauling')
      this.rider.s = ((u - 0.2) / 0.35) * this.stopS
      this.payload = this.payloadTarget
      this.speed = this.cruise
    } else if (u < 0.7) {
      this.setPhase('dumping')
      this.rider.s = this.stopS
      this.timer = ((u - 0.55) / 0.15) * this.dur * 0.8
      this.payload = this.payloadTarget * (1 - this.timer / this.dur)
    } else {
      this.setPhase('returning')
      this.rider.s = (1 - (u - 0.7) / 0.3) * this.stopS
      this.speed = this.cruise
    }
    this.lane = this.dir > 0 ? -LANE : LANE
  }

  private setPhase(p: TruckPhase) {
    const r = this.rng
    this.phase = p
    this.timer = 0
    if (p === 'loading') {
      this.dir = -1
      this.dur = range(r, 24, 38)
      this.payloadTarget = range(r, 150, 220)
      this.payload = 0
      // refuel stop at the face, so fuel stays plausible in a long unattended autoplay
      if (this.fuel < 20) this.fuel = range(r, 85, 95)
    } else if (p === 'hauling') {
      this.dir = 1
      this.cruise = range(r, 3.5, 7) * MOVE_SCALE
    } else if (p === 'dumping') {
      this.dir = 1
      this.dur = range(r, 12, 18)
    } else {
      this.dir = -1
      this.payload = 0
      this.cruise = range(r, 8.5, 11) * MOVE_SCALE
    }
  }

  update(dt: number) {
    const r = this.rider
    if (this.fire !== 'none') {
      this.speed = Math.max(0, this.speed - this.brake * dt)
      this.pull = Math.min(PULL, this.pull + (PULL / 4) * dt)
      r.s = clamp(r.s + this.speed * dt * this.dir, 0, r.length)
    } else if (this.pull > 0) {
      this.speed = 0
      this.pull = Math.max(0, this.pull - (PULL / 4) * dt)
    } else {
      switch (this.phase) {
        case 'loading':
          this.timer += dt
          this.payload = this.payloadTarget * Math.min(1, this.timer / this.dur)
          if (this.timer >= this.dur) this.setPhase('hauling')
          break
        case 'hauling':
          if (r.drive(this, this.stopS, this.cruise, this.limit, dt)) this.setPhase('dumping')
          break
        case 'dumping':
          this.timer += dt
          this.payload = this.payloadTarget * Math.max(0, 1 - this.timer / this.dur)
          if (this.timer >= this.dur) this.setPhase('returning')
          break
        case 'returning':
          if (r.drive(this, 0, this.cruise, this.limit, dt)) this.setPhase('loading')
          break
      }
    }
    this.lane = easeLane(this.lane, this.dir > 0 ? -LANE : LANE, this, dt)
    this.place()
  }

  private place() {
    this.rider.place(this, this.lane + (this.dir > 0 ? -this.pull : this.pull))
  }

  /** once per sim second */
  telemetry(t: number) {
    this.fuel = Math.max(4, this.fuel - (this.moving ? 0.008 : 0.003))
    this.tempAr = 0.85 * this.tempAr + gauss(this.rng) * 0.4
    if (this.forcedTemp !== null) {
      this.tempSmooth = this.forcedTemp
      this.temp = this.forcedTemp + this.tempAr * 0.3
    } else if (this.fire === 'out') {
      this.tempSmooth += (28 - this.tempSmooth) * 0.02
      this.temp = this.tempSmooth
    } else {
      this.tempSmooth += (PHASE_TEMP[this.phase] - this.tempSmooth) * 0.08
      this.temp = this.tempSmooth + this.tempAr
    }
    if (t % 3 === 0) this.series.push(t, this.temp)
    this.status =
      this.fire === 'out'
        ? 'offline'
        : this.fire === 'burning' || this.temp > TEMP_CRIT
          ? 'critical'
          : this.temp > TEMP_WARN || this.suppression === 'fault'
            ? 'warning'
            : 'normal'
  }

  /** cut a loading or dumping stop short, so the truck is back on the road within a few seconds */
  hurry(leftS = 3) {
    if (this.phase === 'loading' || this.phase === 'dumping') this.timer = Math.max(this.timer, this.dur - leftS)
  }

  ignite() {
    this.fire = 'burning'
    this.suppression = 'released'
    this.brake = Math.max(this.speed, 0.1) / 4
  }

  extinguish() {
    this.fire = 'out'
    this.forcedTemp = null
  }

  /** back in service (story reset); peers are the other trucks, so it does not resume on an occupied loading spot */
  restore(peers: readonly Truck[] = []) {
    this.fire = 'none'
    this.forcedTemp = null
    this.suppression = this.def.suppression ?? 'ready'
    const mates = peers.filter((t) => t !== this && t.route === this.route && t.inService)
    if (this.phase === 'loading' && mates.some((t) => t.phase === 'loading')) {
      // rejoin the face queue behind any truck already waiting there
      let s = STOP_GAP
      while (mates.some((t) => t.phase === 'returning' && Math.abs(t.rider.s - s) < STOP_GAP)) s += STOP_GAP
      this.setPhase('returning')
      this.rider.s = s
      this.speed = 0
    }
  }

  get inService(): boolean {
    return this.fire === 'none' && this.pull === 0
  }

  /** driving on the open haul road, away from the face and the dump */
  get onRoad(): boolean {
    const s = this.rider.s
    return (this.phase === 'hauling' || this.phase === 'returning') && this.speed > 2 * MOVE_SCALE && s > 40 && s < this.stopS - 40
  }

  state(): string {
    if (this.fire === 'burning') return 'Pulled over with fire'
    if (this.fire === 'out') return 'Out of service'
    if (this.pull > 0) return 'Returning to the road'
    switch (this.phase) {
      case 'loading':
        return 'Loading'
      case 'hauling':
        return this.moving ? 'Hauling' : 'Waiting at the dump'
      case 'dumping':
        return 'Dumping'
      default:
        return this.moving ? 'Returning empty' : 'Waiting at the face'
    }
  }
}

/** car following on the same route and direction; the loading or dumping truck is the leader at the route end */
export function follow(trucks: Truck[]) {
  for (const a of trucks) {
    a.limit = Infinity
    if (!a.inService || (a.phase !== 'hauling' && a.phase !== 'returning')) continue
    let gap = Infinity
    let lv = 0
    for (const b of trucks) {
      if (b === a || b.route !== a.route || b.fire !== 'none') continue
      const sameLane =
        a.phase === 'hauling' ? b.phase === 'hauling' || b.phase === 'dumping' : b.phase === 'returning' || b.phase === 'loading'
      if (!sameLane) continue
      const g = (b.rider.s - a.rider.s) * a.dir
      if (g > 0 && g < gap) {
        gap = g
        lv = b.phase === a.phase ? b.speed : 0
      }
    }
    if (gap < STOP_GAP) a.limit = 0
    else if (gap < FOLLOW_GAP) a.limit = lv + ((a.cruise - lv) * (gap - STOP_GAP)) / (FOLLOW_GAP - STOP_GAP)
  }
}

/* ------------------------------------------------------------------ */
/* Auxiliary equipment                                                  */
/* ------------------------------------------------------------------ */

/** stationary excavator at its loading point; works while a truck of its route is loading */
export class Swing extends Mobile {
  readonly kind: VehicleKind
  busy: () => boolean = () => false

  constructor(def: VehicleDef, point: Vec, rng: Rng) {
    super(def.id, def.id)
    this.kind = def.kind
    this.operator = def.operator
    this.x = point.x
    this.y = point.y
    // a draw that used to set the swing phase, kept so the seeded stream of the other actors does not shift
    rng()
  }

  update() {}

  state() {
    return this.busy() ? 'Loading a truck' : 'Digging'
  }
}

/** back and forth along a path with pauses at both ends */
export class Shuttle extends Mobile {
  readonly kind: VehicleKind
  private readonly rider: Rider
  private readonly cruise: number
  private readonly pause: number
  private readonly laneAbs: number
  private readonly text: string
  private dir = 1
  private wait = 0
  private lane: number

  constructor(def: VehicleDef, path: Path, o: { speed: number; pause: number; lane: number; state: string }, rng: Rng) {
    super(def.id, def.id)
    this.kind = def.kind
    this.operator = def.operator
    this.rider = new Rider(path)
    this.cruise = o.speed * MOVE_SCALE
    this.pause = o.pause
    this.laneAbs = o.lane
    this.text = o.state
    this.rider.s = rng() * path.length
    this.dir = rng() < 0.5 ? 1 : -1
    this.lane = -this.dir * this.laneAbs
    this.rider.place(this, this.lane)
  }

  update(dt: number) {
    if (this.wait > 0) {
      this.wait -= dt
      this.speed = 0
    } else if (this.rider.drive(this, this.dir > 0 ? this.rider.length : 0, this.cruise, Infinity, dt)) {
      this.dir = -this.dir
      this.wait = this.pause
    }
    this.lane = easeLane(this.lane, -this.dir * this.laneAbs, this, dt)
    this.rider.place(this, this.lane)
  }

  state() {
    return this.text
  }
}

/** drill rig hopping between holes of a small pattern */
export class Drill extends Mobile {
  readonly kind = 'drillRig' as const
  /** holes finished in the current pattern; it starts over after the last hole */
  holesDone: number
  private readonly holes: Vec[] = []
  private idx: number
  private drilling = true
  private timer: number
  private dur: number
  private readonly rng: Rng

  constructor(def: VehicleDef, center: Vec, rng: Rng) {
    super(def.id, def.id)
    this.operator = def.operator
    this.rng = rng
    const th = (BENCH_STRIKE_DEG * Math.PI) / 180
    const ux = Math.sin(th)
    const uy = Math.cos(th)
    for (let row = -1; row <= 1; row++) {
      for (let k = -1; k <= 1; k++) {
        const col = row === 0 ? -k : k
        this.holes.push({ x: center.x + ux * col * 7 + uy * row * 7, y: center.y + uy * col * 7 - ux * row * 7 })
      }
    }
    this.idx = Math.floor(rng() * this.holes.length)
    this.x = this.holes[this.idx].x
    this.y = this.holes[this.idx].y
    this.dur = range(rng, 40, 50)
    this.timer = rng() * this.dur
    // the pattern is drilled in order, so the holes before idx are done (the draw keeps the random stream unchanged)
    rng()
    this.holesDone = this.idx
  }

  get patternSize(): number {
    return this.holes.length
  }

  update(dt: number) {
    if (this.drilling) {
      this.speed = 0
      this.timer += dt
      if (this.timer >= this.dur) {
        this.drilling = false
        this.idx = (this.idx + 1) % this.holes.length
        this.holesDone = this.idx === 0 ? 0 : this.holesDone + 1
      }
      return
    }
    const h = this.holes[this.idx]
    const dx = h.x - this.x
    const dy = h.y - this.y
    const d = Math.hypot(dx, dy)
    const v = 1 * MOVE_SCALE
    if (d <= v * dt) {
      this.x = h.x
      this.y = h.y
      this.speed = 0
      this.drilling = true
      this.timer = 0
      this.dur = range(this.rng, 40, 50)
    } else {
      this.speed = v
      this.x += (dx / d) * v * dt
      this.y += (dy / d) * v * dt
    }
  }

  state() {
    return this.drilling ? `Drilling hole ${this.holesDone + 1} of ${this.holes.length}` : 'Moving to the next hole'
  }
}

/* ------------------------------------------------------------------ */
/* People                                                               */
/* ------------------------------------------------------------------ */

/** wanders inside a circular area with pauses */
export class Walker extends Mobile {
  readonly kind = 'person' as const
  private readonly center: Vec
  private readonly radius: number
  private target: Vec | null = null
  private wait: number
  private readonly rng: Rng

  constructor(def: Omit<PersonDef, 'area'> & { area: AreaId }, rng: Rng) {
    super(def.id, def.label)
    const a = PEOPLE_AREAS[def.area]
    this.rng = rng
    this.center = toLocal(a.center)
    this.radius = a.radius
    this.person = { role: def.role, battery: def.battery, area: AREA_LABEL[def.area] }
    const p = this.pick()
    this.x = p.x
    this.y = p.y
    // a draw that used to set the facing, kept so the seeded stream does not shift
    rng()
    this.wait = range(rng, 0, 10)
  }

  private pick(): Vec {
    const r = this.radius * Math.sqrt(this.rng())
    const a = this.rng() * Math.PI * 2
    return { x: this.center.x + r * Math.sin(a), y: this.center.y + r * Math.cos(a) }
  }

  update(dt: number) {
    if (this.person) this.person.battery = Math.max(5, this.person.battery - dt * 0.0004)
    if (!this.target) {
      this.speed = 0
      this.wait -= dt
      if (this.wait <= 0) this.target = this.pick()
      return
    }
    const dx = this.target.x - this.x
    const dy = this.target.y - this.y
    const d = Math.hypot(dx, dy)
    if (d <= WALK * dt) {
      this.x = this.target.x
      this.y = this.target.y
      this.target = null
      this.speed = 0
      this.wait = range(this.rng, 5, 20)
    } else {
      this.speed = WALK
      this.x += (dx / d) * WALK * dt
      this.y += (dy / d) * WALK * dt
    }
  }

  state() {
    return this.moving ? 'Walking' : 'Working'
  }
}

/* ------------------------------------------------------------------ */
/* Story actors                                                         */
/* ------------------------------------------------------------------ */

/** reserved actor that only moves along its scripted path; idles at home with a few metres of jitter */
export class Scripted extends Mobile {
  readonly kind: ActorKind
  readonly rider: Rider
  private readonly cruise: number
  private readonly rng: Rng
  private goal: number | null = null
  private jx = 0
  private jy = 0
  private jtx = 0
  private jty = 0
  private jt = 0

  constructor(id: string, label: string, kind: ActorKind, path: Path, speed: number, rng: Rng) {
    super(id, label)
    this.kind = kind
    this.rider = new Rider(path)
    this.cruise = speed * MOVE_SCALE
    this.rng = rng
    this.home()
  }

  /** drive to the path end (1) or back home (0) */
  go(end: 0 | 1) {
    this.goal = end * this.rider.length
  }

  home() {
    this.goal = null
    this.rider.s = 0
    this.speed = 0
    this.jx = this.jy = this.jtx = this.jty = 0
    this.rider.place(this, 0)
  }

  get atEnd(): boolean {
    return this.goal === null && this.rider.s > 0
  }

  update(dt: number) {
    if (this.goal !== null) {
      if (this.rider.drive(this, this.goal, this.cruise, Infinity, dt)) this.goal = null
      const f = Math.max(0, 1 - 2 * dt)
      this.jx *= f
      this.jy *= f
    } else if (this.rider.s === 0) {
      this.jt -= dt
      if (this.jt <= 0) {
        const r = 3 * Math.sqrt(this.rng())
        const a = this.rng() * Math.PI * 2
        this.jtx = r * Math.sin(a)
        this.jty = r * Math.cos(a)
        this.jt = range(this.rng, 4, 9)
      }
      const dx = this.jtx - this.jx
      const dy = this.jty - this.jy
      const d = Math.hypot(dx, dy)
      const k = d > 0 ? Math.min(1, (0.4 * dt) / d) : 0
      this.jx += dx * k
      this.jy += dy * k
    }
    this.rider.place(this, 0)
    this.x += this.jx
    this.y += this.jy
  }

  state() {
    const person = this.kind === 'person'
    if (this.goal !== null) return person ? 'Walking' : 'Driving'
    if (this.atEnd) return person ? 'Surveying' : 'Working on the bench'
    return person ? 'Working' : 'Standing by'
  }
}
