/** Builds the UI-facing object summaries and the object card detail for the selected object. */
import { KIND_LABEL } from '@/config/copy'
import type { Level, Metric, ObjectDetail, ObjectRef, ObjectSummary } from '@/engine/contract'
import { PRISM_IDS } from '@/data/sensors'
import { Drill, TEMP_CRIT, TEMP_WARN, Truck, type Mobile } from './actors'
import type { Instrument } from './instruments'
import type { Signal } from './signals'
import type { Blast, Zone } from './zones'

export interface ViewCtx {
  t: number
  active: Signal[]
  zones: Zone[]
  blasts: Blast[]
  instruments: Map<string, Instrument>
  /** sim time of an actor's last polled position */
  fixT(id: string): number
}

const HOUR = 3600

export function fmtDuration(s: number): string {
  const v = Math.max(0, Math.round(s))
  if (v < 60) return `${v} s`
  const m = Math.floor(v / 60)
  if (m < 60) return v % 60 ? `${m} min ${v % 60} s` : `${m} min`
  return m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${Math.floor(m / 60)} h`
}

export const fmtValue = (s: Instrument, v = s.value) => v.toFixed(s.q.digits)

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

export const instrumentRef = (s: Instrument): ObjectRef => ({ id: s.id, label: s.id, kind: s.kind })

export function actorSummary(a: Mobile): ObjectSummary {
  const what = a.person ? a.person.role : KIND_LABEL[a.kind]
  return { ...a.ref, category: a.category, level: a.level, lngLat: a.lngLat, subtitle: `${what}, ${lowerFirst(a.state())}` }
}

export function instrumentSummary(s: Instrument): ObjectSummary {
  return {
    ...instrumentRef(s),
    category: 'sensor',
    level: s.level,
    lngLat: s.lngLat,
    subtitle: `${KIND_LABEL[s.kind]}, ${lowerFirst(s.def.place)}`,
  }
}

const related = (id: string, c: ViewCtx) =>
  c.active.filter((s) => s.subject.id === id || s.involved.some((r) => r.id === id)).map((s) => s.id)

/** labels of the zones the actor is confirmed inside */
export function zonesOf(a: Mobile, c: ViewCtx): string[] {
  const out = c.zones.filter((z) => z.fence.has(a)).map((z) => z.label)
  for (const b of c.blasts) if (b.live && (b.people.has(a) || b.vehicles.has(a))) out.push(`${b.label} exclusion zone`)
  return out
}

const tempLevel = (v: number): Level => (v > TEMP_CRIT ? 'critical' : v > TEMP_WARN ? 'warning' : 'normal')

export function actorDetail(a: Mobile, c: ViewCtx): ObjectDetail {
  const speed: Metric = { key: 'speed', label: 'Speed', value: a.kmh.toFixed(0), unit: 'km/h' }
  const state: Metric = { key: 'state', label: 'State', value: a.state() }
  const base = { ...actorSummary(a), relatedSignalIds: related(a.id, c), updatedAgoS: Math.max(0, Math.round(c.t - c.fixT(a.id))), series: null }

  if (a instanceof Truck) {
    const fs = a.suppression
    // the headline is the charted value, so the chart's current-value dot gets the engine bay level, not the speed level
    const bay: Level = a.fire === 'out' ? 'offline' : a.fire === 'burning' ? 'critical' : tempLevel(a.temp)
    return {
      ...base,
      headline: { label: 'Engine bay temperature', value: a.temp.toFixed(0), unit: '°C', level: bay },
      metrics: [
        speed,
        { key: 'payload', label: 'Payload', value: a.payload.toFixed(0), unit: 't' },
        {
          key: 'fireSystem',
          label: 'Fire system',
          value: fs === 'ready' ? 'Ready' : fs === 'fault' ? 'Fault' : 'Released',
          level: fs === 'ready' ? 'normal' : fs === 'fault' ? 'warning' : 'critical',
        },
        { key: 'fuel', label: 'Fuel', value: a.fuel.toFixed(0), unit: '%', level: a.fuel < 15 ? 'warning' : 'normal' },
        { key: 'operator', label: 'Operator', value: a.operator },
        state,
      ],
      series: { label: 'Engine bay temperature', unit: '°C', warn: TEMP_WARN, crit: TEMP_CRIT, ...a.series.view(c.t - HOUR) },
    }
  }

  if (a.person) {
    const zones = zonesOf(a, c)
    return {
      ...base,
      headline: null,
      metrics: [
        { key: 'role', label: 'Role', value: a.person.role },
        { key: 'area', label: 'Work area', value: a.person.area },
        { key: 'battery', label: 'Tag battery', value: a.person.battery.toFixed(0), unit: '%', level: a.person.battery < 20 ? 'warning' : 'normal' },
        { key: 'zone', label: 'Current zone', value: zones.length ? zones.join(', ') : 'None', level: zones.length ? a.level : undefined },
        speed,
        state,
      ],
    }
  }

  const metrics: Metric[] = [speed, { key: 'operator', label: 'Operator', value: a.operator }, state]
  if (a instanceof Drill) metrics.push({ key: 'holes', label: 'Holes drilled in this pattern', value: String(a.holesDone), unit: `of ${a.patternSize}` })
  const zones = zonesOf(a, c)
  if (zones.length) metrics.push({ key: 'zone', label: 'Current zone', value: zones.join(', '), level: a.level })
  return { ...base, headline: { label: 'Speed', value: speed.value, unit: 'km/h', level: 'normal' }, metrics }
}

export function instrumentDetail(s: Instrument, c: ViewCtx): ObjectDetail {
  const q = s.q
  const metrics: Metric[] = []
  const limit = (key: 'warn' | 'crit', label: string) => {
    const v = q[key]
    if (v !== undefined) metrics.push({ key, label, value: v.toFixed(q.digits === 0 ? 0 : 1), unit: q.unit })
  }
  let headline: ObjectDetail['headline'] = { label: q.label, value: fmtValue(s), unit: q.unit, level: s.level }

  if (s.kind === 'totalStation') {
    const prisms = PRISM_IDS.map((id) => c.instruments.get(id)).filter((p): p is Instrument => !!p)
    const online = prisms.filter((p) => p.level !== 'offline')
    const top = online.reduce<Instrument | null>((m, p) => (!m || p.value > m.value ? p : m), null)
    headline = { label: q.label, value: String(online.length), unit: `of ${prisms.length}`, level: s.level }
    if (top) metrics.push({ key: 'maxRate', label: `Fastest prism, ${top.id}`, value: fmtValue(top), unit: top.q.unit, level: top.level })
    metrics.push({ key: 'cycle', label: 'Measuring cycle', value: '3', unit: 's' })
  } else {
    limit('warn', 'Warning limit')
    limit('crit', 'Critical limit')
  }

  if (s.kind === 'inclinometer' && s.def.depths) {
    const i = s.channels.indexOf(Math.max(...s.channels))
    if (i >= 0) metrics.push({ key: 'worstDepth', label: 'Worst depth', value: String(s.def.depths[i].depthM), unit: 'm' })
  }
  if (s.kind === 'prism') metrics.push({ key: 'station', label: 'Measured by', value: 'TS-1' })
  if (s.kind === 'seismic') {
    const fired = c.blasts.map((b) => b.firedAt).filter((f): f is number => f !== null)
    const last = fired.length ? Math.max(...fired) : null
    metrics.push({ key: 'lastBlast', label: 'Last blast', value: last === null ? 'None this shift' : `${fmtDuration(c.t - last)} ago` })
  }

  const zone = c.zones.find((z) => z.sensor === s)
  let zoneOccupants: ObjectRef[] | undefined
  if (zone) {
    zoneOccupants = zone.fence.inside.map((m) => m.ref)
    const people = zoneOccupants.filter((r) => r.kind === 'person').length
    metrics.push({ key: 'zonePeople', label: 'People in zone', value: String(people) })
    metrics.push({ key: 'zoneVehicles', label: 'Vehicles in zone', value: String(zoneOccupants.length - people) })
  }

  return {
    ...instrumentSummary(s),
    headline,
    metrics,
    series: s.series ? { label: q.label, unit: q.unit, warn: q.warn, crit: q.crit, ...s.series.view(c.t - HOUR) } : null,
    depths: s.def.depths?.map((d, i) => ({
      depthM: d.depthM,
      value: Math.round((s.channels[i] ?? 0) * 100) / 100,
      unit: q.unit,
      level: s.depthLevel(s.channels[i] ?? 0),
    })),
    zoneOccupants,
    relatedSignalIds: c.active.filter((x) => x.subject.id === s.id).map((x) => x.id),
    updatedAgoS: Math.max(0, Math.round(c.t - s.lastAt)),
  }
}
