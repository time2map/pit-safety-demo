/**
 * Mobile equipment and people. Names are fictional.
 * Speeds are displayed (real) speeds in m/s; the simulation moves things MOVE_SCALE times faster.
 */
import type { VehicleKind } from '@/engine/contract'
import type { PEOPLE_AREAS, POINTS, RouteId } from './geometry'

export type HaulRoute = 'haulA' | 'haulB' | 'haulC'
export type PointId = keyof typeof POINTS
export type AreaId = keyof typeof PEOPLE_AREAS

export const ROUTE_LABEL: Record<RouteId, string> = {
  haulA: 'Haul road A',
  haulB: 'Haul road B',
  haulC: 'Haul road C',
  serviceRoad: 'Service road',
  dumpShuttle: 'Dump',
  waterRun: 'Haul road B',
  dozerScript: 'West wall',
  surveyorScript: 'East floor',
}

/** a past bump in a history series: amp added as a half sine between from and to (sim seconds, negative) */
export interface Hump {
  from: number
  to: number
  amp: number
}

export interface TruckDef {
  id: string
  route: HaulRoute
  operator: string
  suppression?: 'fault'
  tempHumps?: Hump[]
}

/** 4 on road A, 3 on B, 3 on C */
export const TRUCKS: TruckDef[] = [
  { id: 'HT-101', route: 'haulA', operator: 'R. Fischer' },
  { id: 'HT-102', route: 'haulA', operator: 'D. Kowal' },
  { id: 'HT-103', route: 'haulA', operator: 'N. Berg' },
  { id: 'HT-104', route: 'haulA', operator: 'H. Vidal' },
  { id: 'HT-105', route: 'haulB', operator: 'O. Marek' },
  { id: 'HT-106', route: 'haulB', operator: 'I. Dahl', tempHumps: [{ from: -1350, to: -1100, amp: 25 }] },
  { id: 'HT-107', route: 'haulB', operator: 'C. Lenz' },
  { id: 'HT-108', route: 'haulC', operator: 'B. Sauer' },
  { id: 'HT-109', route: 'haulC', operator: 'G. Ferrand', suppression: 'fault' },
  { id: 'HT-110', route: 'haulC', operator: 'V. Holm' },
]

export type MotionDef =
  /** stationary at a loading point; works while a truck of route `face` is loading */
  | { type: 'swing'; point: PointId; face: HaulRoute }
  /** back and forth along a route */
  | { type: 'shuttle'; route: RouteId; speed: number; pause: number; lane: number; state: string }
  /** short back and forth from a point toward another point */
  | { type: 'jog'; point: PointId; toward: PointId; length: number; speed: number; pause: number; state: string }
  /** hops between holes of a small grid around a point */
  | { type: 'drill'; point: PointId }
  /** reserved for a story, only moves on its scripted path */
  | { type: 'scripted'; route: RouteId; speed: number }

export interface VehicleDef {
  id: string
  kind: Exclude<VehicleKind, 'haulTruck'>
  operator: string
  motion: MotionDef
}

export const VEHICLES: VehicleDef[] = [
  { id: 'EX-01', kind: 'excavator', operator: 'S. Nilsen', motion: { type: 'swing', point: 'EX01', face: 'haulA' } },
  { id: 'EX-02', kind: 'excavator', operator: 'M. Laine', motion: { type: 'swing', point: 'EX02', face: 'haulB' } },
  { id: 'EX-03', kind: 'excavator', operator: 'F. Roux', motion: { type: 'swing', point: 'EX03', face: 'haulC' } },
  {
    id: 'DZ-01',
    kind: 'dozer',
    operator: 'J. Varga',
    motion: { type: 'shuttle', route: 'dumpShuttle', speed: 1.5, pause: 3, lane: 0, state: 'Pushing at the dump' },
  },
  { id: 'DZ-02', kind: 'dozer', operator: 'T. Aalto', motion: { type: 'scripted', route: 'dozerScript', speed: 2.8 } },
  { id: 'DR-01', kind: 'drillRig', operator: 'E. Brun', motion: { type: 'drill', point: 'DR01' } },
  { id: 'DR-02', kind: 'drillRig', operator: 'A. Costa', motion: { type: 'drill', point: 'DR02' } },
  {
    id: 'WL-01',
    kind: 'loader',
    operator: 'K. Ostrowski',
    motion: { type: 'jog', point: 'WL01', toward: 'dump', length: 22, speed: 2.5, pause: 4, state: 'Working at the dump' },
  },
  {
    id: 'WT-01',
    kind: 'waterTruck',
    operator: 'L. Meyer',
    motion: { type: 'shuttle', route: 'waterRun', speed: 5, pause: 6, lane: 8, state: 'Watering haul road B' },
  },
  {
    id: 'LV-01',
    kind: 'lightVehicle',
    operator: 'P. Engel',
    motion: { type: 'shuttle', route: 'serviceRoad', speed: 9, pause: 12, lane: 3, state: 'Driving the service road' },
  },
]

export interface PersonDef {
  id: string
  label: string
  role: string
  /** area to wander in, or the scripted path for story actors */
  area: AreaId | { route: RouteId }
  battery: number
}

export const PEOPLE: PersonDef[] = [
  { id: 'PE-01', label: 'M. Novak', role: 'Shift supervisor', area: 'office', battery: 86 },
  { id: 'PE-02', label: 'J. Lindqvist', role: 'Surveyor', area: { route: 'surveyorScript' }, battery: 72 },
  { id: 'PE-03', label: 'A. Keller', role: 'Geotechnical engineer', area: 'geotech', battery: 64 },
  { id: 'PE-04', label: 'T. Brandt', role: 'Shotfirer', area: 'drill', battery: 91 },
  { id: 'PE-05', label: 'P. Moreau', role: 'Blast assistant', area: 'drill', battery: 58 },
  { id: 'PE-06', label: 'L. Horvat', role: 'Mechanic', area: 'workshop', battery: 77 },
  { id: 'PE-07', label: 'S. Jansen', role: 'Fitter', area: 'workshop', battery: 43 },
  { id: 'PE-08', label: 'K. Weber', role: 'Electrician', area: 'stockpile', battery: 81 },
  { id: 'PE-09', label: 'E. Rossi', role: 'Safety officer', area: 'floor', battery: 95 },
]

export const AREA_LABEL: Record<AreaId, string> = {
  office: 'Area office',
  workshop: 'Workshop',
  floor: 'Pit floor',
  geotech: 'Geotech station',
  drill: 'Drill pattern',
  stockpile: 'Stockpile',
}

/** actors reserved for the stories */
export const STORY_ACTORS = { dozer: 'DZ-02', surveyor: 'PE-02', fireTruck: 'HT-104' } as const
