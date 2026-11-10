import { describe, expect, it } from 'vitest'
import type { LngLat } from '@/engine/contract'
import { BLASTS } from '@/data/blasts'
import { STORY_ACTORS } from '@/data/fleet'
import { PEOPLE_AREAS, POINTS, ROUTES } from '@/data/geometry'
import { CAPTION_MIN_S } from '@/sim/director'
import { Path, distance, offsetPolygon, pointInPolygon, toLocal, type Vec } from '@/sim/geo'
import type { TimelineEntry } from '@/sim/signals'
import { createSimWorld } from '@/sim/world'

const SEED = 20261110
const LOOP = 360
const BASELINE = ['fault:HT-109', 'limit:IW-04', 'limit:IW-05', 'offline:PZ-03']
const STORY_KEYS = ['blast:B-1', 'fire:HT-104', 'limit:IW-02', 'limit:SR-1', 'temp:HT-104', 'zone:IW-02-zone']
const VEHICLE_ROUTES = ['haulA', 'haulB', 'haulC', 'serviceRoad', 'dumpShuttle', 'dozerScript'] as const

function run(dt: number, until: number, mode: 'auto' | 'manual' = 'auto', before?: (w: ReturnType<typeof createSimWorld>) => void) {
  const w = createSimWorld({ seed: SEED, mode, epochMs: 0 })
  const start = w.activeKeys()
  before?.(w)
  while (w.t < until) w.step(dt)
  return { w, start, log: w.log.filter((e) => e.t < until) }
}

const mmss = (t: number) => `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`
const show = (log: readonly TimelineEntry[]) => log.map((e) => `${mmss(e.t)}  ${e.event.padEnd(10)} ${e.key.padEnd(18)} ${e.level}`).join('\n')
const keysOf = (start: string[], log: readonly TimelineEntry[]) => [...new Set([...start, ...log.map((e) => e.key)])].sort()

describe('autoplay loop', () => {
  const a = run(0.1, LOOP)

  it('prints the timeline', () => {
    console.log(`\nAutoplay timeline, one loop\n${show(a.log)}\n`)
    expect(a.log.length).toBeGreaterThan(0)
  })

  it('starts with the baseline signals', () => {
    expect([...a.start].sort()).toEqual(BASELINE)
  })

  it('raises a critical signal within 60 s', () => {
    const first = a.log.find((e) => e.level === 'critical' && (e.event === 'open' || e.event === 'escalate'))
    expect(first).toBeDefined()
    expect(first!.t).toBeLessThanOrEqual(60)
  })

  it('shows blast, ground and fire signals', () => {
    const types = new Set(a.log.map((e) => e.type))
    for (const t of ['blastEntry', 'groundEntry', 'truckFire'] as const) expect(types.has(t)).toBe(true)
  })

  it('only produces the expected signal keys', () => {
    expect(keysOf(a.start, a.log)).toEqual([...BASELINE, ...STORY_KEYS].sort())
  })

  it('resolves every story signal by the end of the loop', () => {
    const active = new Set(a.w.activeKeys())
    for (const k of STORY_KEYS) {
      const last = a.log.filter((e) => e.key === k).at(-1)
      expect(last?.event, k).toBe('resolve')
      expect(active.has(k), k).toBe(false)
    }
  })

  it('does not depend on how time is sliced', () => {
    const b = run(0.016, LOOP)
    expect(show(b.log)).toEqual(show(a.log))
  })
})

describe('background traffic', () => {
  it('never triggers signals on its own', () => {
    const m = run(0.25, 900, 'manual')
    expect(keysOf(m.start, m.log)).toEqual(BASELINE)
  })

  it('keeps routes, work points and people areas clear of zones and rings', () => {
    const w = createSimWorld({ seed: SEED, mode: 'manual', epochMs: 0 })
    // generous margins: lane offsets, pull-over, exit band
    const zones = w.mapFrame().zones.features.map((f) => offsetPolygon(f.geometry.coordinates[0].slice(0, -1).map((p) => toLocal(p as LngLat)), 25))
    // every vehicle has an operator on board, so routes and work points are checked against the people ring as well
    const rings = BLASTS.map((b) => ({ c: toLocal(POINTS[b.center]), r: b.peopleRadius + 25 }))
    const clear = (p: Vec) => !zones.some((z) => pointInPolygon(p, z)) && rings.every((r) => distance(p, r.c) > r.r)

    for (const id of ['haulA', 'haulB', 'haulC', 'serviceRoad', 'dumpShuttle'] as const) {
      const path = Path.of(ROUTES[id])
      for (let s = 0; s <= path.length; s += 5) expect(clear(path.at(s)), `${id} at ${s} m`).toBe(true)
    }
    for (const id of ['EX01', 'EX02', 'EX03', 'DR01', 'DR02', 'WL01', 'dump'] as const) expect(clear(toLocal(POINTS[id])), id).toBe(true)
    for (const [id, a] of Object.entries(PEOPLE_AREAS)) {
      const c = toLocal(a.center)
      for (let dx = -a.radius; dx <= a.radius; dx += 5)
        for (let dy = -a.radius; dy <= a.radius; dy += 5)
          if (Math.hypot(dx, dy) <= a.radius) expect(clear({ x: c.x + dx, y: c.y + dy }), id).toBe(true)
    }
  })

  it('keeps people areas at least 25 m from every vehicle route', () => {
    for (const [id, a] of Object.entries(PEOPLE_AREAS)) {
      const c = toLocal(a.center)
      for (const route of VEHICLE_ROUTES) {
        const path = Path.of(ROUTES[route])
        for (let s = 0; s <= path.length + 1; s += 1) expect(distance(path.at(s), c) - a.radius, `${id} to ${route} at ${s} m`).toBeGreaterThan(25)
      }
    }
  })
})

describe('captions', () => {
  it(`shows every caption for at least ${CAPTION_MIN_S} s over 3 loops`, () => {
    const w = createSimWorld({ seed: SEED, mode: 'auto', epochMs: 0 })
    const shown: { text: string; from: number; to: number }[] = []
    let cur: { text: string; from: number } | null = null
    while (w.t < 3 * LOOP) {
      w.step(1)
      const t = Math.round(w.t)
      const c = w.snapshot(null).caption
      if (cur && c !== cur.text) {
        shown.push({ ...cur, to: t })
        cur = null
      }
      if (c && !cur) cur = { text: c, from: t }
    }
    // 5 ground, 6 blast and 3 fire captions per loop
    expect(shown.length).toBe(3 * 14)
    for (const s of shown) expect(s.to - s.from, `${mmss(s.from)} ${s.text}`).toBeGreaterThanOrEqual(CAPTION_MIN_S)
  })
})

describe('manual mode', () => {
  it('runs the blast story once with a 120 s countdown', () => {
    const m = run(0.25, 200, 'manual', (w) => w.triggerStory('blast'))
    const blast = m.log.filter((e) => e.key === 'blast:B-1')
    expect(blast.map((e) => e.event)).toEqual(['open', 'escalate', 'resolve'])
    expect(blast[2].t).toBeLessThan(121)
    const snap = m.w.snapshot(STORY_ACTORS.surveyor)
    expect(snap.stories.find((s) => s.id === 'blast')?.state).toBe('done')
    expect(snap.selected?.label).toBe('J. Lindqvist')
  })

  it('runs the seismic story: a critical tremor on SS-1, then P-04 above its warning limit, both resolved', () => {
    const m = run(0.25, 240, 'manual', (w) => w.triggerStory('seismic'))
    const quake = m.log.filter((e) => e.key === 'seismic:SS-1')
    expect(quake[0]).toMatchObject({ event: 'open', level: 'critical' })
    expect(quake[0].t).toBeLessThanOrEqual(4)
    expect(quake.at(-1)?.event).toBe('resolve')
    const prism = m.log.filter((e) => e.key === 'limit:P-04')
    expect(prism[0]).toMatchObject({ event: 'open', level: 'warning' })
    expect(prism.at(-1)?.event).toBe('resolve')
    expect(m.w.snapshot(null).stories.find((s) => s.id === 'seismic')?.state).toBe('done')
    // nothing else wakes up
    expect(keysOf([], m.log)).toEqual(['limit:P-04', 'seismic:SS-1'])
  })

  it('marks pins in a signal, and badges those nobody has acknowledged yet', () => {
    const w = createSimWorld({ seed: SEED, mode: 'manual', epochMs: 0 })
    const sensor = (id: string) => w.mapFrame().sensors.features.find((f) => f.properties.id === id)!.properties
    // baseline: IW-04 warning not acknowledged yet, IW-05 critical already acknowledged, IW-01 quiet
    expect(sensor('IW-04').alert).toBe('warning')
    expect(sensor('IW-05').alert).toBeUndefined()
    expect(sensor('IW-05').signal).toBe('critical')
    expect(sensor('IW-01').signal).toBeUndefined()
    const sig = w.snapshot(null).signalsActive.find((s) => s.subject.id === 'IW-04' && s.status === 'new')!
    w.acknowledge(sig.id)
    expect(sensor('IW-04').alert).toBeUndefined()
    // still in an active signal, so its pin keeps full size
    expect(sensor('IW-04').signal).toBe('warning')
  })

  it('ripples around the subject of a signal until someone acknowledges it, with no one-off ripple on top', () => {
    const w = createSimWorld({ seed: SEED, mode: 'manual', epochMs: 0 })
    const pin = (id: string) => {
      const f = w.mapFrame()
      return [...f.sensors.features, ...f.actors.features].find((x) => x.properties.id === id)!.properties
    }
    const active = () => w.snapshot(null).signalsActive
    // baseline: IW-04 not acknowledged ripples, IW-05 acknowledged does not
    expect(pin('IW-04').ripple).toBe('warning')
    expect(pin('IW-05').ripple).toBeUndefined()
    w.drainPulses()

    w.triggerStory('ground')
    const zoneSignal = () => active().find((s) => s.type === 'groundEntry' && s.subject.id === 'IW-02')
    const limitSignal = () => active().find((s) => s.type === 'movementLimit' && s.subject.id === 'IW-02')
    while (w.t < 200 && !zoneSignal()) w.step(1)
    const zone = zoneSignal()!
    expect(zone.status).toBe('new')
    // acknowledge the limit signal on the same instrument, so the ripple left can only come from the zone signal
    const limit = limitSignal()
    if (limit?.status === 'new') w.acknowledge(limit.id)
    expect(pin('IW-02').ripple).toBe(zone.level)
    // whoever is inside gets the badge but no ripple of their own
    const inside = zone.involved[0]!.id
    expect(pin(inside).alert).toBe(zone.level)
    expect(pin(inside).ripple).toBeUndefined()
    // opening signals adds no one-off ripple on top of the loop
    expect(w.drainPulses()).toEqual([])
    // ticking a response step acknowledges it, and the ripple stops
    w.toggleStep(zone.id, zone.checklist[0]!.id)
    expect(pin('IW-02').ripple).toBeUndefined()
  })

  it('ripples around a vehicle or person when it is the subject', () => {
    const w = createSimWorld({ seed: SEED, mode: 'manual', epochMs: 0 })
    const ripple = (id: string) => w.mapFrame().actors.features.find((x) => x.properties.id === id)?.properties.ripple
    w.triggerStory('blast')
    const entry = () => w.snapshot(null).signalsActive.find((s) => s.type === 'blastEntry' && s.status === 'new')
    while (w.t < 200 && !entry()) w.step(1)
    const sig = entry()!
    expect(sig).toBeDefined()
    expect(ripple(sig.subject.id)).toBe(sig.level)
    w.acknowledge(sig.id)
    expect(ripple(sig.subject.id)).toBeUndefined()
  })

  it('lists the signals nobody has acknowledged yet first, then by level', () => {
    const w = createSimWorld({ seed: SEED, mode: 'auto', epochMs: 0 })
    const rank = { critical: 3, warning: 2, offline: 1 } as const
    for (const t of [0, 60, 150, 200, 260]) {
      w.seek(t)
      const list = w.snapshot(null).signalsActive
      const order = list.map((s) => [s.status === 'new' ? 1 : 0, rank[s.level]] as const)
      for (let i = 1; i < order.length; i++) {
        const [a, b] = [order[i - 1]!, order[i]!]
        expect(a[0] > b[0] || (a[0] === b[0] && a[1] >= b[1]), `t ${t}: ${list[i - 1]!.title} before ${list[i]!.title}`).toBe(true)
      }
    }
    // at the start the acknowledged critical IW-05 sits below the new warnings and the new offline signal
    const w0 = createSimWorld({ seed: SEED, mode: 'manual', epochMs: 0 })
    const ids = () => w0.snapshot(null).signalsActive.map((s) => `${s.subject.id} ${s.status}`)
    expect(ids()).toEqual(['HT-109 new', 'IW-04 new', 'PZ-03 new', 'IW-05 acknowledged'])
    // acknowledging drops a signal below every new one; among acknowledged ones the level still leads
    w0.acknowledge(w0.snapshot(null).signalsActive.find((s) => s.subject.id === 'HT-109')!.id)
    expect(ids()).toEqual(['IW-04 new', 'PZ-03 new', 'IW-05 acknowledged', 'HT-109 acknowledged'])
  })

  it('builds a snapshot and a map frame', () => {
    const w = createSimWorld({ seed: SEED, mode: 'auto', epochMs: 0 })
    w.seek(170)
    const snap = w.snapshot('HT-104')
    expect(snap.kpis.equipmentTotal).toBe(19)
    expect(snap.kpis.sensorsTotal).toBe(17)
    expect(snap.objects.length).toBe(19 + 9 + 17)
    expect(snap.selected?.series?.v.length).toBeGreaterThan(100)
    const f1 = w.mapFrame()
    const f2 = w.mapFrame()
    expect(f1.actors.features.length).toBe(28)
    expect(f2.versions.zones).toBe(f1.versions.zones)
    // positions only change on a poll: the frame is reused until then
    expect(f2.versions.actors).toBe(f1.versions.actors)
    expect(f2.actors).toBe(f1.actors)
    const where = (f: typeof f1) => f.actors.features.map((x) => x.geometry.coordinates.join())
    const before = where(f1)
    w.step(3)
    expect(where(w.mapFrame())).toEqual(before)
    w.pollPositions()
    const f3 = w.mapFrame()
    expect(f3.versions.actors).toBeGreaterThan(f1.versions.actors)
    expect(where(f3).filter((p, i) => p !== before[i]).length).toBeGreaterThan(5)
  })
})
