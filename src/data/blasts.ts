import type { PointId } from './fleet'

export interface BlastDef {
  id: string
  label: string
  center: PointId
  place: string
  /** block size in metres, long side along the bench strike */
  length: number
  width: number
  /** people are checked against the people ring, vehicles against the vehicle ring */
  peopleRadius: number
  vehicleRadius: number
}

export const BLASTS: BlastDef[] = [
  {
    id: 'B-1',
    label: 'Blast B-1',
    center: 'B1',
    place: 'East floor',
    length: 170,
    width: 70,
    peopleRadius: 340,
    vehicleRadius: 195,
  },
]
