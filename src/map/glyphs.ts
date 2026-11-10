/**
 * Own glyphs for the pit objects, drawn for this demo on lucide's 24 px grid (2 px stroke, round caps and
 * joins), so they sit next to lucide UI icons. Vehicles face right in side view.
 * The same nodes feed the map pins (vanilla lucide createElement) and the panels (createLucideIcon).
 */
import type { ObjectKind } from '@/engine/contract'

/** lucide's icon node shape with string attributes, so both lucide and lucide-vue-next accept it */
export type GlyphNode = [tag: string, attrs: Record<string, string>][]

const haulTruck: GlyphNode = [
  ['path', { d: 'M2 5h18v2.5h-3.5L15 12H6L2 8z' }],
  ['path', { d: 'M17 12V9.5h3l1 2.5v2' }],
  ['circle', { cx: '7', cy: '17', r: '3' }],
  ['circle', { cx: '17', cy: '17', r: '3' }],
]

const excavator: GlyphNode = [
  ['rect', { x: '2', y: '17', width: '13', height: '4', rx: '2' }],
  ['path', { d: 'M3 17v-5h9v5' }],
  ['path', { d: 'M7 12V8h3.5l1.5 4' }],
  ['path', { d: 'M12 14 17 5l4 7' }],
  ['path', { d: 'M21 12v3h-3' }],
]

const dozer: GlyphNode = [
  ['rect', { x: '2', y: '16', width: '13', height: '5', rx: '2.5' }],
  ['path', { d: 'M3 16v-4h9v4' }],
  ['path', { d: 'M6 12V7h4l1.5 5' }],
  ['path', { d: 'M15 18h3' }],
  ['path', { d: 'M18 10h3v11h-3c1.3-3.5 1.3-7.5 0-11z' }],
]

const drillRig: GlyphNode = [
  ['rect', { x: '2', y: '17', width: '12', height: '4', rx: '2' }],
  ['path', { d: 'M3 17v-5h8v5' }],
  ['path', { d: 'M3 12V9h4v3' }],
  ['path', { d: 'M15 2v17M19 2v17M15 2h4M15 8l4 4M19 8l-4 4' }],
  ['path', { d: 'M17 19v3' }],
]

const loader: GlyphNode = [
  ['circle', { cx: '6', cy: '18', r: '3' }],
  ['circle', { cx: '15', cy: '18', r: '3' }],
  ['path', { d: 'M2 16v-4h3V6h5l1 6h1.5' }],
  ['path', { d: 'M9 16h3' }],
  ['path', { d: 'M12 12.5 17.5 14' }],
  ['path', { d: 'M17 11h5l-1 6h-3.5z' }],
]

const waterTruck: GlyphNode = [
  ['rect', { x: '2', y: '5', width: '14', height: '9', rx: '3' }],
  ['path', { d: 'M9 7.5c-1.2 1.6-2 2.6-2 3.5a2 2 0 0 0 4 0c0-.9-.8-1.9-2-3.5z', fill: 'currentColor', stroke: 'none' }],
  ['path', { d: 'M17 14V8h2.5l2 3v3' }],
  ['circle', { cx: '6.5', cy: '17.5', r: '2.5' }],
  ['circle', { cx: '17.5', cy: '17.5', r: '2.5' }],
]

const lightVehicle: GlyphNode = [
  ['path', { d: 'M5 17H3a1 1 0 0 1-1-1v-3h9l2-4h5l3 4h1a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2' }],
  ['path', { d: 'M9 17h6' }],
  ['circle', { cx: '7', cy: '17', r: '2' }],
  ['circle', { cx: '17', cy: '17', r: '2' }],
  ['path', { d: 'M4 13V3l4 1.5L4 6' }],
]

const person: GlyphNode = [
  ['path', { d: 'M6.5 9.5a5.5 5.5 0 0 1 11 0' }],
  ['path', { d: 'M5 9.5h14' }],
  ['path', { d: 'M12 4v2.5' }],
  ['path', { d: 'M8.5 9.5a3.5 3.5 0 0 0 7 0' }],
  ['path', { d: 'M5 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1' }],
]

const inclinometer: GlyphNode = [
  ['path', { d: 'M4 21h16' }],
  ['path', { d: 'M8 21V3' }],
  ['path', { d: 'M8 21 17 4' }],
  ['path', { d: 'M8 12a9 9 0 0 1 3.8.9' }],
]

const piezometer: GlyphNode = [
  ['path', { d: 'M9 3v14a3 3 0 0 0 6 0V3' }],
  ['path', { d: 'M9 11h6v6a3 3 0 0 1-6 0z', fill: 'currentColor', stroke: 'none' }],
  ['path', { d: 'M2 11h4' }],
  ['path', { d: 'M18 11h4' }],
]

const prism: GlyphNode = [
  ['circle', { cx: '12', cy: '9', r: '6.5' }],
  ['path', { d: 'M12 5.5 15.5 11.5h-7z' }],
  ['path', { d: 'M12 15.5V22' }],
]

const totalStation: GlyphNode = [
  ['rect', { x: '8', y: '2', width: '8', height: '8', rx: '1.5' }],
  ['circle', { cx: '12', cy: '6', r: '1.5' }],
  ['path', { d: 'M9 13h6' }],
  ['path', { d: 'M12 13 6 22' }],
  ['path', { d: 'm12 13 6 9' }],
  ['path', { d: 'M12 13v9' }],
]

const radar: GlyphNode = [
  ['path', { d: 'M3 10a8 8 0 0 0 11 11z' }],
  ['path', { d: 'm8.5 15.5 3.5-3.5' }],
  ['circle', { cx: '12.5', cy: '11.5', r: '1' }],
  ['path', { d: 'M15 6a3 3 0 0 1 3 3' }],
  ['path', { d: 'M15 2a7 7 0 0 1 7 7' }],
]

const seismic: GlyphNode = [
  ['path', { d: 'M2 12h4l2-5 3 11 3-14 2.5 11 1.5-3h4' }],
]

export const PIT_GLYPH: Record<ObjectKind, GlyphNode> = {
  haulTruck,
  excavator,
  dozer,
  drillRig,
  loader,
  waterTruck,
  lightVehicle,
  person,
  inclinometer,
  piezometer,
  prism,
  totalStation,
  radar,
  seismic,
}
