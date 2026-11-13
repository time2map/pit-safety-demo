/**
 * Contract between the simulation (src/sim), the map adapter (src/map)
 * and the UI (src/ui). Pure types plus a few constant lists.
 * Do not change existing fields without updating all three sides.
 */
import type { FeatureCollection, LineString, Point, Polygon } from 'geojson'

export type LngLat = [number, number]

/** Status levels shown everywhere (map, badges, legend). */
export type Level = 'normal' | 'warning' | 'critical' | 'offline'
export const LEVELS: Level[] = ['normal', 'warning', 'critical', 'offline']

export type VehicleKind = 'haulTruck' | 'excavator' | 'dozer' | 'drillRig' | 'loader' | 'lightVehicle'
export type SensorKind = 'inclinometer' | 'piezometer' | 'prism' | 'totalStation' | 'radar' | 'seismic'
export type ObjectKind = VehicleKind | 'person' | SensorKind
export type ObjectCategory = 'vehicle' | 'person' | 'sensor'

export const VEHICLE_KINDS: VehicleKind[] = ['haulTruck', 'excavator', 'dozer', 'drillRig', 'loader', 'lightVehicle']
export const SENSOR_KINDS: SensorKind[] = ['inclinometer', 'piezometer', 'prism', 'totalStation', 'radar', 'seismic']
export const OBJECT_KINDS: ObjectKind[] = [...VEHICLE_KINDS, 'person', ...SENSOR_KINDS]
/** Objects the map camera can follow: everything that drives or walks (excavators only swing in place). */
export const FOLLOW_KINDS: ObjectKind[] = ['haulTruck', 'dozer', 'drillRig', 'loader', 'lightVehicle', 'person']

export type SignalType =
  | 'blastEntry' // person or vehicle inside a blast exclusion ring while armed
  | 'groundEntry' // person or vehicle inside a ground movement zone in warning/critical
  | 'movementLimit' // displacement rate above a limit (inclinometer, prism, radar)
  | 'pressureLimit' // pore pressure above a limit (piezometer)
  | 'engineTemp' // engine bay temperature high
  | 'truckFire' // fire detected, suppression released
  | 'suppressionFault' // fire suppression system fault
  | 'sensorOffline' // no data for too long
  | 'seismicEvent' // the seismograph registers a ground tremor that is not a blast
export type SignalStatus = 'new' | 'acknowledged' | 'resolved'
export type SignalLevel = 'warning' | 'critical' | 'offline'

export type StoryId = 'ground' | 'blast' | 'fire' | 'seismic'
export type BlastPhase = 'scheduled' | 'armed' | 'final' | 'fired' | 'clear'

/* ------------------------------------------------------------------ */
/* UI snapshot (published about twice per second, read via shallowRef) */
/* ------------------------------------------------------------------ */

export interface ObjectRef {
  id: string
  /** short name shown to users, e.g. "HT-104", "IW-02", "A. Keller" */
  label: string
  kind: ObjectKind
}

export interface ObjectSummary extends ObjectRef {
  category: ObjectCategory
  level: Level
  lngLat: LngLat
  /** one short line, e.g. "Haul truck, hauling" or "Inclinometer well" */
  subtitle: string
  /** more words to find the object by in the search: operator, role, work area, place, haul road */
  keywords: string[]
}

export interface Metric {
  key: string
  label: string
  /** already formatted, e.g. "21", "Ready" */
  value: string
  /** e.g. "km/h" */
  unit?: string
  /** colours the value when not normal */
  level?: Level
}

export interface SeriesView {
  /** e.g. "Displacement rate" */
  label: string
  /** e.g. "mm/day" */
  unit: string
  warn?: number
  crit?: number
  /** sim seconds, ascending; the last point is "now" */
  t: number[]
  v: number[]
}

export interface DepthReading {
  depthM: number
  value: number
  unit: string
  level: Level
}

export interface ObjectDetail extends ObjectSummary {
  /** main live value, big number at the top of the object card */
  headline: { label: string; value: string; unit: string; level: Level } | null
  metrics: Metric[]
  series: SeriesView | null
  depths?: DepthReading[]
  /** for instruments with a zone: who is inside right now */
  zoneOccupants?: ObjectRef[]
  relatedSignalIds: string[]
  /** seconds since the last reading (sensors) or position fix (mobile) */
  updatedAgoS: number
}

export interface ChecklistStep {
  id: string
  label: string
  done: boolean
}

export interface SignalView {
  id: string
  type: SignalType
  /** short, sentence case, e.g. "Person in blast zone" or "Ground movement" (config/copy.ts SIGNAL_TITLE) */
  title: string
  level: SignalLevel
  status: SignalStatus
  /** the instrument, zone owner or vehicle the signal is about */
  subject: ObjectRef
  /** e.g. "Blast B-1", "West wall, IW-02 zone", "Haul road A" */
  place: string
  /** sim seconds */
  openedAt: number
  updatedAt: number
  resolvedAt?: number
  people: number
  vehicles: number
  involved: ObjectRef[]
  /** e.g. "3.4 mm/day, critical limit 3.0" */
  valueText?: string
  checklist: ChecklistStep[]
  /** true once the underlying condition has cleared or all steps are done */
  canResolve: boolean
  /** condition still present (zone still occupied, value still above limit) */
  conditionActive: boolean
}

export interface NextBlast {
  zoneId: string
  /** "Blast B-1" */
  label: string
  phase: BlastPhase
  /** seconds until firing; negative after firing */
  inS: number
}

export interface Kpis {
  equipmentOnline: number
  equipmentTotal: number
  people: number
  sensorsReporting: number
  sensorsTotal: number
  /** active (not resolved) critical signals */
  critical: number
  /** active warning signals (offline signals are listed but not counted here) */
  warning: number
  nextBlast: NextBlast | null
}

export interface StoryView {
  id: StoryId
  /** "Slope movement", "Blast", "Truck fire", "Seismic event" */
  title: string
  state: 'idle' | 'running' | 'done'
  /** 0..1 */
  progress: number
}

export interface Snapshot {
  /** sim seconds since start */
  t: number
  /** wall-clock epoch (ms) that corresponds to t = 0, for the site clock */
  epochMs: number
  kpis: Kpis
  /** not yet acknowledged first, then most severe, then newest */
  signalsActive: SignalView[]
  /** most recently resolved first, capped */
  signalsResolved: SignalView[]
  /** narration line for the current scenario beat, null when nothing to say */
  caption: string | null
  stories: StoryView[]
  autoplay: boolean
  /** seconds into the autoplay loop and its length */
  loopT: number
  loopLength: number
  speed: number
  paused: boolean
  /** object the map camera follows, null while the camera is free */
  following: string | null
  selected: ObjectDetail | null
  objects: ObjectSummary[]
}

/* ------------------------------------------------------------------ */
/* Map frame (built by the world, applied by the map adapter)           */
/* ------------------------------------------------------------------ */

export interface ActorProps {
  id: string
  label: string
  kind: ObjectKind
  level: Level
  /** worst level of the active signals this object is in; absent when none. Such a pin stays full size even with its layer off */
  signal?: SignalLevel
  /** worst level of the signals this object is in that nobody has acknowledged yet; absent when none (corner badge) */
  alert?: SignalLevel
  /**
   * worst level of the not yet acknowledged signals this object is the subject of; absent when none.
   * The map keeps ripples going around such a pin until the signal is acknowledged or resolved.
   */
  ripple?: SignalLevel
}

export interface SensorProps {
  id: string
  label: string
  kind: SensorKind
  level: Level
  /** see ActorProps.signal */
  signal?: SignalLevel
  /** see ActorProps.alert */
  alert?: SignalLevel
  /** see ActorProps.ripple */
  ripple?: SignalLevel
}

export interface ZoneProps {
  id: string
  /** owning instrument id */
  sensorId: string
  label: string
  level: Level
  /** critical and its signal is not acknowledged yet: the outline breathes */
  attention: boolean
  kind: 'ground' | 'radar'
}

export interface BlastProps {
  id: string
  label: string
  phase: BlastPhase
  part: 'block' | 'peopleRing' | 'vehicleRing'
  level: Level
}

/** A one-off ripple. Signals nobody has acknowledged yet ripple in a loop instead (ActorProps.ripple). */
export interface Pulse {
  /** unique per pulse */
  key: string
  lngLat: LngLat
  level: Level
  /** blast firing or the start of a tremor */
  big?: boolean
}

export interface MapFrame {
  actors: FeatureCollection<Point, ActorProps>
  sensors: FeatureCollection<Point, SensorProps>
  zones: FeatureCollection<Polygon, ZoneProps>
  blasts: FeatureCollection<Polygon | LineString, BlastProps>
  /** counters bumped when the matching collection changed; the adapter skips the layer update or pin sync otherwise */
  versions: { actors: number; sensors: number; zones: number; blasts: number }
}

/* ------------------------------------------------------------------ */
/* Engine API exposed to the UI via provide/inject                      */
/* ------------------------------------------------------------------ */

export type LayerGroup = 'vehicles' | 'people' | 'sensors' | 'zones'
export const LAYER_GROUPS: LayerGroup[] = ['vehicles', 'people', 'sensors', 'zones']

export interface MapControls {
  zoomIn(): void
  zoomOut(): void
  resetNorth(): void
  fitSite(): void
  setLayer(g: LayerGroup, on: boolean): void
}

export interface EngineCommands {
  /** map selection; selecting a moving object (FOLLOW_KINDS) also puts the follow camera on it */
  select(id: string | null): void
  /** select and centre the map on the object */
  focus(id: string): void
  /**
   * Keep the camera on the selected moving object (its id), or stop with null. Selection already
   * starts it; this turns it back on after a pan, or off. Selecting another object, Fit site and a
   * pan by the user stop it too.
   */
  follow(id: string | null): void
  acknowledge(signalId: string): void
  toggleStep(signalId: string, stepId: string): void
  resolve(signalId: string): void
  setSpeed(speed: 1 | 2 | 4): void
  togglePause(): void
  setAutoplay(on: boolean): void
  triggerStory(id: StoryId): void
  reset(): void
}
