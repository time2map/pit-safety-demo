/**
 * Geotechnical and vibration instruments. Values are fictional.
 * History shapes describe the 60 minutes before t = 0 (pre-generated at 30 s spacing).
 */
import type { SensorKind } from '@/engine/contract'
import type { Hump, PointId } from './fleet'

export interface Quantity {
  label: string
  unit: string
  warn?: number
  crit?: number
  digits: number
}

export const QUANTITY: Record<SensorKind, Quantity> = {
  inclinometer: { label: 'Displacement rate', unit: 'mm/day', warn: 2, crit: 3, digits: 1 },
  prism: { label: 'Displacement rate', unit: 'mm/day', warn: 2, crit: 3, digits: 1 },
  radar: { label: 'Max displacement rate', unit: 'mm/day', warn: 2, crit: 3, digits: 1 },
  piezometer: { label: 'Pore pressure', unit: 'kPa', warn: 180, crit: 210, digits: 0 },
  seismic: { label: 'Peak particle velocity', unit: 'mm/s', warn: 10, crit: 25, digits: 2 },
  totalStation: { label: 'Prisms tracked', unit: 'prisms', digits: 0 },
}

export interface InstrumentDef {
  id: string
  kind: SensorKind
  point: PointId
  /** e.g. "West wall" */
  place: string
  base: number
  /** AR(1) innovation sigma */
  sigma: number
  /** value at t = -3600, linearly approaching base at t = 0 */
  historyFrom?: number
  humps?: Hump[]
  /** no samples inside this window (sim seconds) */
  gap?: [number, number]
  /** stopped reporting at this time and stays silent */
  silentFrom?: number
  /** inclinometer channels: value = (base + drive) * factor + noise */
  depths?: { depthM: number; factor: number }[]
  zone?: 'ground' | 'radar'
}

const DEPTHS = [
  { depthM: 6, factor: 0.55 },
  { depthM: 14, factor: 1 },
  { depthM: 22, factor: 0.35 },
]

export const INSTRUMENTS: InstrumentDef[] = [
  { id: 'IW-01', kind: 'inclinometer', point: 'IW01', place: 'South west wall', base: 0.6, sigma: 0.03, depths: DEPTHS, zone: 'ground' },
  { id: 'IW-02', kind: 'inclinometer', point: 'IW02', place: 'West wall', base: 1.3, sigma: 0.03, depths: DEPTHS, zone: 'ground' },
  { id: 'IW-03', kind: 'inclinometer', point: 'IW03', place: 'West wall', base: 0.9, sigma: 0.03, depths: DEPTHS, zone: 'ground' },
  {
    id: 'IW-04',
    kind: 'inclinometer',
    point: 'IW04',
    place: 'North west wall',
    base: 2.35,
    sigma: 0.03,
    historyFrom: 1.5,
    depths: DEPTHS,
    zone: 'ground',
  },
  {
    id: 'IW-05',
    kind: 'inclinometer',
    point: 'IW05',
    place: 'North west wall',
    base: 3.45,
    sigma: 0.03,
    historyFrom: 2.4,
    depths: DEPTHS,
    zone: 'ground',
  },
  { id: 'PZ-01', kind: 'piezometer', point: 'PZ01', place: 'South west wall', base: 128, sigma: 0.6 },
  { id: 'PZ-02', kind: 'piezometer', point: 'PZ02', place: 'West wall', base: 141, sigma: 0.6 },
  { id: 'PZ-03', kind: 'piezometer', point: 'PZ03', place: 'West wall', base: 136, sigma: 0.6, silentFrom: -1500 },
  { id: 'PZ-04', kind: 'piezometer', point: 'PZ04', place: 'North west wall', base: 147, sigma: 0.6 },
  { id: 'P-01', kind: 'prism', point: 'P01', place: 'South west wall', base: 0.5, sigma: 0.04 },
  { id: 'P-02', kind: 'prism', point: 'P02', place: 'West wall', base: 0.7, sigma: 0.04 },
  { id: 'P-03', kind: 'prism', point: 'P03', place: 'West wall', base: 0.8, sigma: 0.04 },
  {
    id: 'P-04',
    kind: 'prism',
    point: 'P04',
    place: 'North west wall',
    base: 1.1,
    sigma: 0.04,
    humps: [{ from: -3000, to: -2400, amp: 1.25 }],
  },
  { id: 'P-05', kind: 'prism', point: 'P05', place: 'North west wall', base: 0.6, sigma: 0.04 },
  { id: 'TS-1', kind: 'totalStation', point: 'TS1', place: 'Geotech station', base: 5, sigma: 0 },
  { id: 'SR-1', kind: 'radar', point: 'SR1', place: 'West wall', base: 1.2, sigma: 0.03, zone: 'radar' },
  { id: 'SS-1', kind: 'seismic', point: 'SS1', place: 'South floor', base: 0.1, sigma: 0.01, gap: [-1920, -1740] },
]

/** prisms measured by the robotic total station */
export const PRISM_IDS = ['P-01', 'P-02', 'P-03', 'P-04', 'P-05']
