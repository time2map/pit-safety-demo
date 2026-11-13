/**
 * The simulated pit. Pure TypeScript: no Vue, DOM or MapLibre.
 * Fixed 50 ms steps with an accumulator; logic (sensors, geofences, signals, stories) once per sim second.
 */
import type { Feature, FeatureCollection, Geometry } from 'geojson'
import { LEVEL_RANK, worst } from '@/config/levels'
import type {
  ActorProps,
  BlastProps,
  Kpis,
  Level,
  LngLat,
  MapFrame,
  ObjectRef,
  Pulse,
  SensorProps,
  SignalLevel,
  Snapshot,
  StoryId,
  ZoneProps,
} from '@/engine/contract'
import { PEOPLE, ROUTE_LABEL, STORY_ACTORS, TRUCKS, VEHICLES, type HaulRoute, type VehicleDef } from '@/data/fleet'
import { POINTS, ROUTES } from '@/data/geometry'
import { INSTRUMENTS } from '@/data/sensors'
import { Drill, Mobile, Scripted, Shuttle, Swing, TEMP_CRIT, TEMP_WARN, Truck, Walker, follow } from './actors'
import type { World, WorldOptions } from './api'
import { Director, LOOP_LENGTH } from './director'
import { Path, clamp, distance, toLocal } from './geo'
import { Instrument, SAMPLE_EVERY } from './instruments'
import { createStreams, type Streams } from './rng'
import { SignalBoard, type Desired, type TimelineEntry } from './signals'
import type { StoryCtx } from './stories'
import { actorDetail, actorSummary, fmtDuration, fmtValue, instrumentDetail, instrumentRef, instrumentSummary, type ViewCtx } from './view'
import { Blast, Zone, buildBlasts, buildZones } from './zones'

export const STEP = 0.05
const STEPS_PER_S = 20
const MAX_PULSES = 30
/** seismograph peak at the blast, mm/s, decaying over a few seconds */
const BLAST_PPV = 4.6
/** a seismic event signal stays open this long (s) after the last tick with SS-1 at warning or above */
export const QUAKE_HOLD = 90

/** World plus debugging hooks used by the scenario test */
export interface SimWorld extends World {
  /** signal opens, escalations, de-escalations, reopens and resolves since t = 0 */
  readonly log: readonly TimelineEntry[]
  activeKeys(): string[]
}

export function createWorld(opts: WorldOptions): World {
  return createSimWorld(opts)
}

export function createSimWorld(opts: WorldOptions): SimWorld {
  return new SimWorldImpl(opts)
}

const fc = <G extends Geometry, P>(features: Feature<G, P>[]): FeatureCollection<G, P> => ({ type: 'FeatureCollection', features })

/** already resolved signals shown as history on start */
const HISTORY: { key: string; openedAt: number; resolvedAt: number; valueText: string }[] = [
  { key: 'temp:HT-106', openedAt: -1253, resolvedAt: -1190, valueText: `108 °C, limit ${TEMP_WARN}` },
  { key: 'offline:SS-1', openedAt: -1890, resolvedAt: -1735, valueText: 'Data gap of 3 min' },
  { key: 'limit:P-04', openedAt: -2846, resolvedAt: -2540, valueText: '2.3 mm/day, warning limit 2.0' },
]

class SimWorldImpl implements SimWorld {
  private n = 0
  private acc = 0
  private sec = 0
  private readonly epochMs: number
  private readonly rng: Streams
  private readonly trucks: Truck[] = []
  private readonly actors: Mobile[]
  private readonly actorById = new Map<string, Mobile>()
  private readonly instruments: Instrument[]
  private readonly instrById = new Map<string, Instrument>()
  private readonly zones: Zone[]
  private readonly blasts: Blast[]
  private readonly board: SignalBoard
  private readonly director: Director
  private readonly ctx: StoryCtx
  private pulses: Pulse[] = []
  private pulseSeq = 0
  private lastPulse = ''
  private readonly ver = { actors: 0, sensors: 0, zones: 0, blasts: 0 }
  private readonly sig = { actors: '', sensors: '', zones: '', blasts: '' }
  private readonly cache: {
    actors?: MapFrame['actors']
    sensors?: MapFrame['sensors']
    zones?: MapFrame['zones']
    blasts?: MapFrame['blasts']
    built: { actors: number; sensors: number; zones: number; blasts: number }
  } = { built: { actors: -1, sensors: -1, zones: -1, blasts: -1 } }
  /**
   * Last polled position of every actor and the sim time of that poll: what the map shows.
   * Movement itself is continuous; the map only learns about it on a poll, like a tracking server.
   */
  private readonly fixes = new Map<string, { at: LngLat; t: number }>()
  /** objects in an active signal, with the worst such signal level (full-size pins) */
  private readonly inSignal = new Map<string, SignalLevel>()
  /** objects in a signal nobody has acknowledged yet, with the worst such signal level (corner badge) */
  private readonly alerts = new Map<string, SignalLevel>()
  /** subjects of the signals nobody has acknowledged yet, with the worst such signal level (looping ripples) */
  private readonly ripples = new Map<string, SignalLevel>()
  /** the current or last ground tremor on SS-1, behind the seismic event signal; null before the first */
  private quake: { lastAt: number; peak: number; level: 'warning' | 'critical' } | null = null

  constructor(opts: WorldOptions) {
    this.epochMs = opts.epochMs
    const r = (this.rng = createStreams(opts.seed))

    // trucks spread over their cycle, one at the face per route
    const byRoute = new Map<HaulRoute, number>()
    const perRoute = (route: HaulRoute) => TRUCKS.filter((d) => d.route === route).length
    for (const d of TRUCKS) {
      const i = byRoute.get(d.route) ?? 0
      byRoute.set(d.route, i + 1)
      const n = perRoute(d.route)
      const u = i === 0 ? 0 : clamp((i + (r.trucks() - 0.5) * 0.15) / n, 0, 0.999)
      this.trucks.push(new Truck(d, r.trucks, u))
    }
    const vehicles = VEHICLES.map((d) => {
      // a water truck that used to run here, between WL-01 and LV-01, drew two numbers from the misc stream;
      // they are still drawn, so LV-01, the zone outlines and everything else seeded after keep their values
      if (d.id === 'LV-01') r.misc(), r.misc()
      return this.makeVehicle(d)
    })
    const people = PEOPLE.map((p) => {
      if (typeof p.area === 'string') return new Walker({ ...p, area: p.area }, r.people)
      const s = new Scripted(p.id, p.label, 'person', Path.of(ROUTES[p.area.route]), 1.3, r.people)
      s.person = { role: p.role, battery: p.battery, area: ROUTE_LABEL[p.area.route] }
      return s
    })
    this.actors = [...this.trucks, ...vehicles, ...people]
    for (const a of this.actors) this.actorById.set(a.id, a)

    this.instruments = INSTRUMENTS.map((d) => new Instrument(d, r.sensors))
    for (const s of this.instruments) this.instrById.set(s.id, s)
    this.zones = buildZones(this.instruments, this.actors.length, r.misc)
    this.blasts = buildBlasts(this.actors.length)
    this.board = new SignalBoard()
    this.director = new Director(opts.mode === 'auto')

    const actor = <T extends Mobile>(id: string) => this.actorById.get(id) as T
    this.ctx = {
      t: 0,
      setDrive: (id, v) => {
        const s = this.instrById.get(id)
        if (s) s.drive = v
      },
      say: (caption) => this.director.say(caption, this.sec),
      dozer: actor<Scripted>(STORY_ACTORS.dozer),
      surveyor: actor<Scripted>(STORY_ACTORS.surveyor),
      fireTruck: actor<Truck>(STORY_ACTORS.fireTruck),
      trucks: this.trucks,
      blast: this.blasts[0],
    }

    this.tick(0)
    this.seedBaseline()
    this.pollPositions()
  }

  private makeVehicle(d: VehicleDef): Mobile {
    const m = d.motion
    const r = this.rng.misc
    switch (m.type) {
      case 'swing': {
        const sw = new Swing(d, toLocal(POINTS[m.point]), r)
        sw.busy = () => this.trucks.some((t) => t.route === m.face && t.phase === 'loading' && t.inService)
        return sw
      }
      case 'shuttle':
        return new Shuttle(d, Path.of(ROUTES[m.route]), m, r)
      case 'jog': {
        const a = toLocal(POINTS[m.point])
        const b = toLocal(POINTS[m.toward])
        const k = m.length / (distance(a, b) || 1)
        return new Shuttle(d, new Path([a, { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }]), { ...m, lane: 0 }, r)
      }
      case 'drill':
        return new Drill(d, toLocal(POINTS[m.point]), r)
      case 'scripted': {
        const s = new Scripted(d.id, d.id, d.kind, Path.of(ROUTES[m.route]), m.speed, r)
        s.operator = d.operator
        s.area = ROUTE_LABEL[m.route]
        return s
      }
    }
  }

  /** baseline at t = 0: back-date the standing signals and add a few resolved ones as history */
  private seedBaseline() {
    const b = this.board
    const crossing = (id: string, limit: number) => {
      const d = this.instrById.get(id)?.def
      if (!d || d.historyFrom === undefined) return -600
      return Math.round((-3600 * (d.base - limit)) / (d.base - d.historyFrom))
    }
    const backdate = (key: string, openedAt: number, ack: boolean, stepsDone: number) => {
      const s = b.active.find((x) => x.key === key)
      if (!s) return
      s.openedAt = s.updatedAt = openedAt
      if (ack) s.status = 'acknowledged'
      s.steps.slice(0, stepsDone).forEach((x) => (x.done = true))
    }
    // critical for about half an hour: work is stopped and the engineer has been told
    backdate('limit:IW-05', crossing('IW-05', 3), true, 2)
    backdate('limit:IW-04', crossing('IW-04', 2), false, 0)
    backdate('offline:PZ-03', (this.instrById.get('PZ-03')?.lastAt ?? -60) + 30, false, 0)
    backdate('fault:HT-109', -940, false, 0)

    for (const h of HISTORY) {
      const [kind, id] = h.key.split(':')
      const s = this.instrById.get(id)
      const a = this.actorById.get(id)
      const subject: ObjectRef | undefined = s ? instrumentRef(s) : a?.ref
      if (!subject) continue
      const sig = b.create(h.openedAt, {
        key: h.key,
        type: kind === 'temp' ? 'engineTemp' : kind === 'offline' ? 'sensorOffline' : 'movementLimit',
        level: kind === 'offline' ? 'offline' : 'warning',
        subject,
        place: s ? s.def.place : a instanceof Truck ? ROUTE_LABEL[a.route] : '',
        involved: [],
        valueText: h.valueText,
      })
      Object.assign(sig, { status: 'resolved', resolvedAt: h.resolvedAt, updatedAt: h.resolvedAt, conditionActive: false })
      sig.steps.forEach((x) => (x.done = true))
      b.resolved.push(sig)
    }
    b.resolved.sort((x, y) => (y.resolvedAt ?? 0) - (x.resolvedAt ?? 0))
    b.log.length = 0
    this.pulses = []
    this.refreshLevels()
  }

  /* ---------------------------------------------------------------- */
  /* Time                                                               */
  /* ---------------------------------------------------------------- */

  get t(): number {
    return this.n * STEP
  }

  step(dt: number) {
    if (!(dt > 0)) return
    this.acc += dt
    while (this.acc >= STEP - 1e-9) {
      this.acc -= STEP
      this.fixedStep()
    }
    if (this.acc < 0) this.acc = 0
  }

  seek(t: number) {
    while (this.n * STEP < t - 1e-9) this.fixedStep()
    this.acc = 0
    // skipping ahead: ripples for events minutes back in sim time would otherwise all play at once
    this.pulses = []
    this.pollPositions()
  }

  pollPositions() {
    const t = this.t
    let moved = false
    for (const a of this.actors) {
      const at = a.lngLat
      const f = this.fixes.get(a.id)
      if (f && f.at[0] === at[0] && f.at[1] === at[1]) f.t = t
      else {
        this.fixes.set(a.id, { at, t })
        moved = true
      }
    }
    if (moved) this.ver.actors++
  }

  /** signal and alert levels on a map feature; left out when the object is in no signal */
  private markSignal(props: ActorProps | SensorProps, id: string) {
    const signal = this.inSignal.get(id)
    if (signal) props.signal = signal
    const alert = this.alerts.get(id)
    if (alert) props.alert = alert
    const ripple = this.ripples.get(id)
    if (ripple) props.ripple = ripple
  }

  /** where the map shows an actor: its last polled position */
  private shownAt(a: Mobile): LngLat {
    return this.fixes.get(a.id)?.at ?? a.lngLat
  }

  private fixedStep() {
    this.n++
    const t = this.n * STEP
    follow(this.trucks)
    for (const a of this.actors) a.update(STEP, t)
    if (this.n % STEPS_PER_S === 0) this.tick(this.n / STEPS_PER_S)
  }

  private tick(sec: number) {
    this.sec = sec
    this.ctx.t = sec
    this.director.tick(sec, this.ctx)

    const ss = this.instrById.get('SS-1')
    let firedNow = false
    let lastFired = -Infinity
    for (const b of this.blasts) {
      if (b.tick(sec)) {
        firedNow = true
        this.pulse(b.lngLat, 'critical', true)
      }
      if (b.firedAt !== null) lastFired = Math.max(lastFired, b.firedAt)
    }
    if (ss) {
      const since = sec - lastFired
      ss.extra = since >= 0 && since < 60 ? BLAST_PPV * Math.exp(-since / 4) : 0
      if (firedNow) ss.sample(sec, this.rng.sensors)
    }

    const sampling = sec % SAMPLE_EVERY === 0
    for (const s of this.instruments) {
      if (sampling) s.sample(sec, this.rng.sensors)
      s.refresh(sec)
    }
    if (ss) this.trackQuake(ss, sec)
    for (const tr of this.trucks) tr.telemetry(sec)
    for (const z of this.zones) z.fence.update(this.actors)
    for (const b of this.blasts) {
      b.people.update(this.actors)
      b.vehicles.update(this.actors)
    }
    this.board.reconcile(sec, this.desired(sec))
    this.refreshLevels()
  }

  /**
   * A tremor is SS-1 at warning or above (blast vibration stays well below the warning limit).
   * One that starts after the hold of the last one has passed is a new event, with a big ripple.
   */
  private trackQuake(ss: Instrument, t: number) {
    if (ss.level !== 'warning' && ss.level !== 'critical') return
    const q = this.quake
    if (!q || t - q.lastAt >= QUAKE_HOLD) {
      this.quake = { lastAt: t, peak: ss.value, level: ss.level }
      this.pulse(ss.lngLat, ss.level, true)
      return
    }
    q.lastAt = t
    q.peak = Math.max(q.peak, ss.value)
    if (ss.level === 'critical') q.level = 'critical'
  }

  /* ---------------------------------------------------------------- */
  /* Signals                                                            */
  /* ---------------------------------------------------------------- */

  private desired(t: number): Desired[] {
    const out: Desired[] = []
    const inside = (ms: Mobile[]) => (ms.length === 1 ? `${ms[0].label} inside` : `${ms.length} inside`)

    for (const z of this.zones) {
      // the radar scan area covers the ground zones of several wells; their own zone signals report who is inside
      if (z.kind !== 'ground') continue
      const s = z.sensor
      const occ = z.fence.inside
      if ((s.level === 'warning' || s.level === 'critical') && occ.length) {
        out.push({
          key: `zone:${z.id}`,
          type: 'groundEntry',
          level: s.level,
          subject: instrumentRef(s),
          place: z.place,
          involved: occ.map((m) => m.ref),
          valueText: `${inside(occ)}, ${s.id} at ${fmtValue(s)} ${s.q.unit}`,
        })
      }
    }

    for (const b of this.blasts) {
      const occ = b.occupants()
      if (!b.live || !occ.length || b.fireAt === null) continue
      const left = b.fireAt - t
      out.push({
        key: `blast:${b.id}`,
        type: 'blastEntry',
        level: b.phase === 'armed' ? 'warning' : 'critical',
        subject: occ[0].ref,
        place: b.label,
        involved: occ.map((m) => m.ref),
        valueText: `${inside(occ)}, ${left > 0 ? `firing in ${fmtDuration(left)}` : 'fired'}`,
      })
    }

    for (const s of this.instruments) {
      const place = s.def.place
      if (s.level === 'offline') {
        out.push({
          key: `offline:${s.id}`,
          type: 'sensorOffline',
          level: 'offline',
          subject: instrumentRef(s),
          place,
          involved: [],
          valueText: `Last reading ${fmtDuration(t - s.lastAt)} ago`,
        })
        continue
      }
      const type = s.limitType
      if (!type || (s.level !== 'warning' && s.level !== 'critical')) continue
      const limit = s.level === 'critical' ? s.q.crit : s.q.warn
      out.push({
        key: `limit:${s.id}`,
        type,
        level: s.level,
        subject: instrumentRef(s),
        place,
        involved: [],
        valueText: `${fmtValue(s)} ${s.q.unit}, ${s.level} limit ${limit?.toFixed(s.q.digits === 0 ? 0 : 1)}`,
      })
    }

    // the event signal keeps the worst level and the peak of the tremor until the hold has passed
    const q = this.quake
    const ss = this.instrById.get('SS-1')
    if (q && ss && t - q.lastAt < QUAKE_HOLD) {
      const limit = q.level === 'critical' ? ss.q.crit : ss.q.warn
      out.push({
        key: 'seismic:SS-1',
        type: 'seismicEvent',
        level: q.level,
        subject: instrumentRef(ss),
        place: ss.def.place,
        involved: [],
        valueText: `Peak ${q.peak.toFixed(1)} ${ss.q.unit}, ${q.level} limit ${limit}`,
      })
    }

    for (const tr of this.trucks) {
      const base = { subject: tr.ref, place: ROUTE_LABEL[tr.route], involved: [] }
      if (tr.fire === 'burning') {
        out.push({ ...base, key: `fire:${tr.id}`, type: 'truckFire', level: 'critical', valueText: 'Suppression released, truck pulled over' })
      } else if (tr.fire === 'none' && tr.temp > TEMP_WARN) {
        const critical = tr.temp > TEMP_CRIT
        out.push({
          ...base,
          key: `temp:${tr.id}`,
          type: 'engineTemp',
          level: critical ? 'critical' : 'warning',
          valueText: `${tr.temp.toFixed(0)} °C, ${critical ? `critical limit ${TEMP_CRIT}` : `limit ${TEMP_WARN}`}`,
        })
      }
      if (tr.suppression === 'fault') {
        out.push({ ...base, key: `fault:${tr.id}`, type: 'suppressionFault', level: 'warning', valueText: 'Suppression system reports a fault' })
      }
    }
    return out
  }

  private pulse(lngLat: LngLat, level: Level, big = false) {
    // one-off ripples (blast firing, the start of a tremor), one per place and level per tick: a repeat only
    // upgrades it to big. Signals do not come through here: the subject of a signal nobody has acknowledged
    // yet ripples in a loop on the map instead (props.ripple)
    const tag = `${this.sec}|${lngLat.join()}|${level}`
    if (tag === this.lastPulse) {
      const last = this.pulses[this.pulses.length - 1]
      if (big && last && !last.big) last.big = true
      return
    }
    this.lastPulse = tag
    this.pulses.push({ key: `p${++this.pulseSeq}`, lngLat, level, big: big || undefined })
    if (this.pulses.length > MAX_PULSES) this.pulses.splice(0, this.pulses.length - MAX_PULSES)
  }

  /** zone, sensor, blast and actor levels; bumps map versions when something visible changed */
  private refreshLevels() {
    const active = this.board.active
    this.inSignal.clear()
    this.alerts.clear()
    this.ripples.clear()
    const mark = (into: Map<string, SignalLevel>, id: string, level: SignalLevel) => {
      const cur = into.get(id)
      into.set(id, cur ? (worst(cur, level) as SignalLevel) : level)
    }
    for (const s of active) {
      for (const id of [s.subject.id, ...s.involved.map((r) => r.id)]) {
        mark(this.inSignal, id, s.level)
        if (s.status === 'new') mark(this.alerts, id, s.level)
      }
      if (s.status === 'new') mark(this.ripples, s.subject.id, s.level)
    }
    const badge = (id: string) =>
      (this.inSignal.get(id)?.[0] ?? '-') + (this.alerts.get(id)?.[0] ?? '-') + (this.ripples.get(id)?.[0] ?? '-')
    const sensors = this.instruments.map((s) => s.level[0] + badge(s.id)).join('')
    if (sensors !== this.sig.sensors) {
      this.sig.sensors = sensors
      this.ver.sensors++
    }
    for (const z of this.zones) {
      z.level = z.sensor.level
      z.attention =
        z.level === 'critical' &&
        active.some((a) => a.status === 'new' && (a.key === `zone:${z.id}` || a.key === `limit:${z.sensor.id}`))
    }
    const zones = this.zones.map((z) => z.level[0] + (z.attention ? '!' : '')).join('')
    if (zones !== this.sig.zones) {
      this.sig.zones = zones
      this.ver.zones++
    }
    const blasts = this.blasts.map((b) => b.phase).join()
    if (blasts !== this.sig.blasts) {
      this.sig.blasts = blasts
      this.ver.blasts++
    }
    const involved = new Map<string, Level>()
    for (const s of active) for (const r of s.involved) involved.set(r.id, worst(involved.get(r.id) ?? 'normal', s.level))
    for (const a of this.actors) a.level = a.status === 'offline' ? 'offline' : worst(a.status, involved.get(a.id) ?? 'normal')
    // a status colour shows at once; positions wait for the next poll
    const actors = this.actors.map((a) => a.level[0] + badge(a.id)).join('')
    if (actors !== this.sig.actors) {
      this.sig.actors = actors
      this.ver.actors++
    }
  }

  /* ---------------------------------------------------------------- */
  /* Views                                                              */
  /* ---------------------------------------------------------------- */

  mapFrame(): MapFrame {
    const c = this.cache
    if (c.built.actors !== this.ver.actors || !c.actors) {
      c.actors = fc(
        this.actors.map((a) => {
          const props: ActorProps = {
            id: a.id,
            label: a.label,
            kind: a.kind,
            level: a.level,
          }
          this.markSignal(props, a.id)
          return { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: this.shownAt(a) }, properties: props }
        }),
      )
      c.built.actors = this.ver.actors
    }
    if (c.built.sensors !== this.ver.sensors || !c.sensors) {
      c.sensors = fc(
        this.instruments.map((s) => {
          const props: SensorProps = { id: s.id, label: s.id, kind: s.kind, level: s.level }
          this.markSignal(props, s.id)
          return { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: s.lngLat }, properties: props }
        }),
      )
      c.built.sensors = this.ver.sensors
    }
    if (c.built.zones !== this.ver.zones || !c.zones) {
      // radar scan area first, so the ground zones inside it draw above it and come first in map queries
      const order = [...this.zones.filter((z) => z.kind === 'radar'), ...this.zones.filter((z) => z.kind !== 'radar')]
      c.zones = fc(
        order.map((z) => {
          const props: ZoneProps = { id: z.id, sensorId: z.sensor.id, label: z.label, level: z.level, attention: z.attention, kind: z.kind }
          return { type: 'Feature' as const, geometry: { type: 'Polygon' as const, coordinates: [z.ring] }, properties: props }
        }),
      )
      c.built.zones = this.ver.zones
    }
    if (c.built.blasts !== this.ver.blasts || !c.blasts) {
      const features: MapFrame['blasts']['features'] = []
      for (const b of this.blasts) {
        const part = (p: BlastProps['part'], ring: LngLat[]) => {
          const props: BlastProps = { id: b.id, label: b.label, phase: b.phase, part: p, level: b.level }
          features.push({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] }, properties: props })
        }
        part('block', b.block)
        if (b.ringsVisible) {
          part('peopleRing', b.peopleRing)
          part('vehicleRing', b.vehicleRing)
        }
      }
      c.blasts = fc(features)
      c.built.blasts = this.ver.blasts
    }
    return {
      actors: c.actors,
      sensors: c.sensors,
      zones: c.zones,
      blasts: c.blasts,
      versions: { ...this.ver },
    }
  }

  private viewCtx(): ViewCtx {
    return {
      t: this.t,
      active: this.board.active,
      zones: this.zones,
      blasts: this.blasts,
      instruments: this.instrById,
      fixT: (id) => this.fixes.get(id)?.t ?? this.t,
    }
  }

  snapshot(selectedId: string | null): Snapshot {
    const t = Math.round(this.t * 100) / 100
    const b = this.board
    // signals nobody has acknowledged yet come first, then the worst level, then the newest
    const fresh = (s: { status: string }) => (s.status === 'new' ? 1 : 0)
    const active = [...b.active].sort(
      (x, y) =>
        fresh(y) - fresh(x) ||
        LEVEL_RANK[y.level] - LEVEL_RANK[x.level] ||
        y.openedAt - x.openedAt ||
        y.updatedAt - x.updatedAt,
    )
    let critical = 0
    let warning = 0
    // offline signals stay in the list but are not warnings; the sensors KPI already shows how many report
    for (const s of active) {
      if (s.level === 'critical') critical++
      else if (s.level === 'warning') warning++
    }
    const vehicles = this.actors.filter((a) => a.category === 'vehicle')
    const blast = this.blasts[0]
    const fireAt = blast ? (blast.fireAt ?? this.director.nextAutoFire(this.sec)) : null
    const kpis: Kpis = {
      equipmentOnline: vehicles.filter((a) => a.status !== 'offline').length,
      equipmentTotal: vehicles.length,
      people: this.actors.length - vehicles.length,
      sensorsReporting: this.instruments.filter((s) => s.level !== 'offline').length,
      sensorsTotal: this.instruments.length,
      critical,
      warning,
      nextBlast:
        blast && fireAt !== null
          ? { zoneId: blast.id, label: blast.label, phase: blast.phase, inS: Math.round(fireAt - t) }
          : null,
    }
    return {
      t,
      epochMs: this.epochMs,
      kpis,
      signalsActive: active.map((s) => b.view(s)),
      signalsResolved: b.resolved.map((s) => b.view(s)),
      caption: this.director.caption,
      stories: this.director.views(this.sec),
      autoplay: this.director.autoplay,
      loopT: this.director.loopT(t),
      loopLength: LOOP_LENGTH,
      speed: 1,
      paused: false,
      following: null,
      selected: selectedId ? this.detail(selectedId) : null,
      objects: [...this.actors.map(actorSummary), ...this.instruments.map(instrumentSummary)],
    }
  }

  private detail(id: string) {
    const a = this.actorById.get(id)
    if (a) return actorDetail(a, this.viewCtx())
    const s = this.instrById.get(id) ?? this.zones.find((z) => z.id === id)?.sensor
    return s ? instrumentDetail(s, this.viewCtx()) : null
  }

  drainPulses(): Pulse[] {
    const p = this.pulses
    this.pulses = []
    return p
  }

  positionOf(id: string): LngLat | null {
    const a = this.actorById.get(id)
    if (a) return this.shownAt(a)
    const s = this.instrById.get(id) ?? this.zones.find((z) => z.id === id)?.sensor
    if (s) return s.lngLat
    return this.blasts.find((b) => b.id === id)?.lngLat ?? null
  }

  /* ---------------------------------------------------------------- */
  /* Commands                                                           */
  /* ---------------------------------------------------------------- */

  acknowledge(signalId: string) {
    this.board.acknowledge(signalId, this.sec)
    this.refreshLevels()
  }

  toggleStep(signalId: string, stepId: string) {
    this.board.toggleStep(signalId, stepId, this.sec)
    // a ticked step can acknowledge the signal, which clears the pin badges and the zone attention
    this.refreshLevels()
  }

  resolve(signalId: string) {
    this.board.resolve(signalId, this.sec)
    this.refreshLevels()
  }

  setAutoplay(on: boolean) {
    this.director.setAutoplay(on)
  }

  get autoplay(): boolean {
    return this.director.autoplay
  }

  triggerStory(id: StoryId) {
    this.director.trigger(id)
  }

  /* ---------------------------------------------------------------- */
  /* Test hooks                                                         */
  /* ---------------------------------------------------------------- */

  get log(): readonly TimelineEntry[] {
    return this.board.log
  }

  activeKeys(): string[] {
    return this.board.active.map((s) => s.key)
  }
}
