/**
 * Static review data for the HUD, so it can be looked at without the simulation.
 *   mockSnapshot()       a realistic Snapshot mid-scenario
 *   createMockContext()  an AppContext around it (commands mutate the mock, the clock ticks)
 */
import { reactive, ref, shallowRef } from 'vue'
import type {
  ChecklistStep,
  LayerGroup,
  ObjectRef,
  ObjectSummary,
  SignalLevel,
  SignalStatus,
  SignalType,
  SignalView,
  Snapshot,
  StoryId,
} from '@/engine/contract'
import type { AppContext } from '@/engine/keys'
import { createOutlet } from '@/engine/outlet'
import { CHECKLIST, SIGNAL_TITLE } from '@/config/copy'
import { readOptions } from '@/config/options'
import { POINTS } from '@/data/geometry'

const T = 1260

const ref_ = (id: string, label: string, kind: ObjectRef['kind']): ObjectRef => ({ id, label, kind })
const IW02 = ref_('IW-02', 'IW-02', 'inclinometer')
const DZ01 = ref_('DZ-01', 'DZ-01', 'dozer')
const NOVAK = ref_('P-07', 'M. Novak', 'person')

function steps(type: SignalType, done = 0): ChecklistStep[] {
  return CHECKLIST[type].map((label, i) => ({ id: `${type}-${i}`, label, done: i < done }))
}

function signal(
  p: Partial<SignalView> & { id: string; type: SignalType; level: SignalLevel; status: SignalStatus; subject: ObjectRef; place: string; openedAt: number },
): SignalView {
  const people = p.people ?? 0
  const vehicles = p.vehicles ?? 0
  return {
    title: SIGNAL_TITLE[p.type]({ people, vehicles }),
    updatedAt: p.openedAt,
    people,
    vehicles,
    involved: [],
    checklist: steps(p.type),
    canResolve: false,
    conditionActive: true,
    ...p,
  }
}

function series(): { t: number[]; v: number[] } {
  const t: number[] = []
  const v: number[] = []
  for (let s = T - 2400; s <= T; s += 30) {
    const k = (s - (T - 2400)) / 2400
    const wobble = Math.sin(s / 97) * 0.05 + Math.sin(s / 31) * 0.03
    t.push(s)
    v.push(+(0.55 + 0.4 * k + 2.45 * k ** 6 + wobble).toFixed(2))
  }
  v[v.length - 1] = 3.4
  return { t, v }
}

const OBJECTS: ObjectSummary[] = [
  { id: 'HT-104', label: 'HT-104', kind: 'haulTruck', category: 'vehicle', level: 'normal', lngLat: [19.3207, 51.2341], subtitle: 'Haul truck, hauling', keywords: [] },
  { id: 'HT-107', label: 'HT-107', kind: 'haulTruck', category: 'vehicle', level: 'warning', lngLat: [19.3143, 51.2368], subtitle: 'Haul truck, returning', keywords: [] },
  { id: 'EX-01', label: 'EX-01', kind: 'excavator', category: 'vehicle', level: 'normal', lngLat: POINTS.EX01, subtitle: 'Excavator, loading', keywords: [] },
  { id: 'DZ-01', label: 'DZ-01', kind: 'dozer', category: 'vehicle', level: 'critical', lngLat: [19.3006, 51.2348], subtitle: 'Dozer, pushing', keywords: [] },
  { id: 'DR-01', label: 'DR-01', kind: 'drillRig', category: 'vehicle', level: 'normal', lngLat: POINTS.DR01, subtitle: 'Drill rig, drilling', keywords: [] },
  { id: 'P-07', label: 'M. Novak', kind: 'person', category: 'person', level: 'critical', lngLat: [19.3005, 51.2350], subtitle: 'Surveyor', keywords: [] },
  { id: 'P-02', label: 'A. Keller', kind: 'person', category: 'person', level: 'normal', lngLat: [19.3166, 51.2382], subtitle: 'Shift supervisor', keywords: [] },
  { id: 'IW-02', label: 'IW-02', kind: 'inclinometer', category: 'sensor', level: 'critical', lngLat: POINTS.IW02, subtitle: 'West wall, bench 3', keywords: [] },
  { id: 'PZ-03', label: 'PZ-03', kind: 'piezometer', category: 'sensor', level: 'warning', lngLat: POINTS.PZ03, subtitle: 'West wall, bench 5', keywords: [] },
  { id: 'P-04', label: 'P-04', kind: 'prism', category: 'sensor', level: 'offline', lngLat: POINTS.P04, subtitle: 'West wall crest', keywords: [] },
  { id: 'SR-1', label: 'SR-1', kind: 'radar', category: 'sensor', level: 'normal', lngLat: POINTS.SR1, subtitle: 'Slope radar, west wall', keywords: [] },
]

export function mockSnapshot(): Snapshot {
  const active: SignalView[] = [
    signal({
      id: 's-move-iw02',
      type: 'movementLimit',
      level: 'critical',
      status: 'new',
      subject: IW02,
      place: 'West wall, bench 3',
      openedAt: T - 4,
      valueText: '3.4 mm/day, critical limit 3.0',
    }),
    signal({
      id: 's-ground-iw02',
      type: 'groundEntry',
      level: 'critical',
      status: 'acknowledged',
      subject: IW02,
      place: 'West wall, IW-02 zone',
      openedAt: T - 95,
      updatedAt: T - 20,
      people: 1,
      vehicles: 1,
      involved: [DZ01, NOVAK],
      checklist: steps('groundEntry', 2),
      valueText: 'DZ-01 and M. Novak inside the zone',
    }),
    signal({
      id: 's-temp-ht107',
      type: 'engineTemp',
      level: 'warning',
      status: 'new',
      subject: ref_('HT-107', 'HT-107', 'haulTruck'),
      place: 'Haul road B',
      openedAt: T - 45,
      vehicles: 1,
      valueText: '108 °C, limit 105',
    }),
    signal({
      id: 's-press-pz03',
      type: 'pressureLimit',
      level: 'warning',
      status: 'acknowledged',
      subject: ref_('PZ-03', 'PZ-03', 'piezometer'),
      place: 'West wall, bench 5',
      openedAt: T - 610,
      checklist: steps('pressureLimit', 1),
      valueText: '182 kPa, warning limit 175',
    }),
    signal({
      id: 's-off-p04',
      type: 'sensorOffline',
      level: 'offline',
      status: 'acknowledged',
      subject: ref_('P-04', 'P-04', 'prism'),
      place: 'West wall crest',
      openedAt: T - 1500,
      valueText: 'No reading for 25 min',
    }),
  ]

  const resolved: SignalView[] = [
    signal({
      id: 's-fault-ht104',
      type: 'suppressionFault',
      level: 'warning',
      status: 'resolved',
      subject: ref_('HT-104', 'HT-104', 'haulTruck'),
      place: 'Workshop',
      openedAt: T - 1150,
      resolvedAt: T - 380,
      vehicles: 1,
      checklist: steps('suppressionFault', 3),
      canResolve: true,
      conditionActive: false,
    }),
    signal({
      id: 's-blast-b1-old',
      type: 'blastEntry',
      level: 'critical',
      status: 'resolved',
      subject: ref_('LV-03', 'LV-03', 'lightVehicle'),
      place: 'Blast B-1',
      openedAt: T - 1210,
      resolvedAt: T - 1020,
      vehicles: 1,
      checklist: steps('blastEntry', 4),
      canResolve: true,
      conditionActive: false,
    }),
  ]

  const { t, v } = series()
  const stories: { id: StoryId; title: string; state: 'idle' | 'running' | 'done'; progress: number }[] = [
    { id: 'ground', title: 'Slope movement', state: 'running', progress: 0.55 },
    { id: 'blast', title: 'Blast', state: 'idle', progress: 0 },
    { id: 'fire', title: 'Truck fire', state: 'done', progress: 1 },
  ]

  return {
    t: T,
    epochMs: Date.UTC(2026, 10, 10, 6, 30, 0),
    kpis: {
      equipmentOnline: 22,
      equipmentTotal: 23,
      people: 9,
      sensorsReporting: 13,
      sensorsTotal: 14,
      critical: 2,
      warning: 3,
      nextBlast: { zoneId: 'B1', label: 'Blast B-1', phase: 'armed', inS: 160 },
    },
    signalsActive: active,
    signalsResolved: resolved,
    caption: 'IW-02 on the west wall is speeding up, and a dozer has just driven into its zone',
    stories,
    autoplay: true,
    loopT: 312,
    loopLength: 900,
    speed: 1,
    paused: false,
    following: null,
    selected: {
      ...OBJECTS.find((o) => o.id === 'IW-02')!,
      headline: { label: 'Displacement rate', value: '3.4', unit: 'mm/day', level: 'critical' },
      metrics: [
        { key: 'cum', label: 'Cumulative displacement', value: '18.6', unit: 'mm', level: 'warning' },
        { key: 'depth', label: 'Slip surface depth', value: '11', unit: 'm' },
        { key: 'trend', label: 'Trend', value: 'Accelerating', level: 'critical' },
        { key: 'battery', label: 'Battery', value: '86', unit: '%' },
        { key: 'interval', label: 'Reading interval', value: '30', unit: 's' },
      ],
      series: { label: 'Displacement rate', unit: 'mm/day', warn: 2, crit: 3, t, v },
      depths: [
        { depthM: 2, value: 18.6, unit: 'mm', level: 'critical' },
        { depthM: 5, value: 17.9, unit: 'mm', level: 'critical' },
        { depthM: 8, value: 15.2, unit: 'mm', level: 'critical' },
        { depthM: 11, value: 11.4, unit: 'mm', level: 'warning' },
        { depthM: 14, value: 2.1, unit: 'mm', level: 'normal' },
        { depthM: 17, value: 0.6, unit: 'mm', level: 'normal' },
        { depthM: 20, value: 0.2, unit: 'mm', level: 'normal' },
      ],
      zoneOccupants: [DZ01, NOVAK],
      relatedSignalIds: ['s-move-iw02', 's-ground-iw02'],
      updatedAgoS: 3,
    },
    objects: OBJECTS,
  }
}

/** AppContext around the mock snapshot, for reviewing the HUD on its own. */
export function createMockContext(opts: { tick?: boolean } = {}): AppContext {
  const base = mockSnapshot()
  const snapshot = shallowRef<Snapshot>(base)
  const layers = reactive<Record<LayerGroup, boolean>>({ vehicles: true, people: true, sensors: true, zones: true })
  const dockVisible = ref(false)

  const edit = (fn: (s: Snapshot) => void) => {
    const s = structuredClone(snapshot.value)
    fn(s)
    snapshot.value = s
  }
  const withSignal = (id: string, fn: (sig: SignalView, s: Snapshot) => void) =>
    edit((s) => {
      const sig = s.signalsActive.find((x) => x.id === id)
      if (sig) fn(sig, s)
    })

  if (opts.tick !== false && typeof window !== 'undefined') {
    window.setInterval(() => {
      if (snapshot.value.paused) return
      edit((s) => {
        const dt = 0.5 * s.speed
        s.t += dt
        if (s.kpis.nextBlast) {
          s.kpis.nextBlast.inS -= dt
          if (s.kpis.nextBlast.inS <= 60 && s.kpis.nextBlast.phase === 'armed') s.kpis.nextBlast.phase = 'final'
          if (s.kpis.nextBlast.inS <= 0 && s.kpis.nextBlast.phase === 'final') s.kpis.nextBlast.phase = 'fired'
        }
        if (s.selected) s.selected.updatedAgoS = (s.selected.updatedAgoS + dt) % 30
      })
    }, 500)
  }

  const pick = (id: string | null) => edit((s) => (s.selected = id ? (s.selected ?? structuredClone(base.selected)) : null))

  return {
    snapshot,
    layers,
    dockVisible,
    outlet: createOutlet({
      select: pick,
      focus: pick,
      subjectOf: (id) =>
        [...snapshot.value.signalsActive, ...snapshot.value.signalsResolved].find((x) => x.id === id)?.subject.id ?? null,
    }),
    options: readOptions(),
    map: {
      zoomIn() {},
      zoomOut() {},
      resetNorth() {},
      fitSite() {},
      setLayer: (g, on) => (layers[g] = on),
    },
    commands: {
      select: (id) => edit((s) => (s.selected = id ? (s.selected ?? structuredClone(base.selected)) : null)),
      focus: (id) => edit((s) => (s.selected = s.selected ?? (id ? structuredClone(base.selected) : null))),
      acknowledge: (id) => withSignal(id, (sig) => (sig.status = 'acknowledged')),
      toggleStep: (id, stepId) =>
        withSignal(id, (sig) => {
          const step = sig.checklist.find((c) => c.id === stepId)
          if (step) step.done = !step.done
          sig.canResolve = !sig.conditionActive || sig.checklist.every((c) => c.done)
        }),
      resolve: (id) =>
        edit((s) => {
          const i = s.signalsActive.findIndex((x) => x.id === id)
          if (i < 0) return
          const [sig] = s.signalsActive.splice(i, 1)
          s.signalsResolved.unshift({ ...sig!, status: 'resolved', resolvedAt: s.t })
        }),
      setSpeed: (speed) => edit((s) => (s.speed = speed)),
      togglePause: () => edit((s) => (s.paused = !s.paused)),
      follow: (id) => edit((s) => (s.following = id)),
      setAutoplay: (on) => edit((s) => (s.autoplay = on)),
      triggerStory: (id) =>
        edit((s) => {
          for (const st of s.stories) if (st.id === id) Object.assign(st, { state: 'running', progress: 0.05 })
        }),
      reset: () => (snapshot.value = mockSnapshot()),
    },
  }
}
