/**
 * Own glyphs for the pit objects, drawn for this demo on lucide's 24 px grid (2 px stroke, round caps and
 * joins), so they sit next to lucide UI icons. Sober engineering outlines: vehicles face right in side view on
 * one shared system (wheels r 2.5 on y 18.5, tracks 12 x 5 on y 16, ground at y 21), few parts per glyph and
 * no decorative details. The same nodes feed the map pins (vanilla lucide createElement) and the panels
 * (createLucideIcon).
 */
import type { ObjectKind } from '@/engine/contract'

/** lucide's icon node shape with string attributes, so both lucide and lucide-vue-next accept it */
export type GlyphNode = [tag: string, attrs: Record<string, string>][]

const haulTruck: GlyphNode = [
  ['path', { d: 'M2 4h16l-2 8H5L2 9z' }],
  ['path', { d: 'M16 12v4M2 16h20v-5l-3-3h-2' }],
  ['circle', { cx: '6.5', cy: '18.5', r: '2.5' }],
  ['circle', { cx: '17.5', cy: '18.5', r: '2.5' }],
]

const excavator: GlyphNode = [
  ['rect', { x: '2', y: '16', width: '12', height: '5', rx: '2.5' }],
  ['path', { d: 'M3 16v-4h3V8h5v8' }],
  ['path', { d: 'M11 13 15 4l6 7v5h-4' }],
]

const dozer: GlyphNode = [
  ['rect', { x: '2', y: '16', width: '12', height: '5', rx: '2.5' }],
  ['path', { d: 'M3 16V8h5v4h5v4' }],
  ['path', { d: 'M14 18.5h4' }],
  ['rect', { x: '18', y: '10', width: '4', height: '11', rx: '1' }],
]

const drillRig: GlyphNode = [
  ['rect', { x: '2', y: '16', width: '12', height: '5', rx: '2.5' }],
  ['path', { d: 'M3 16v-4h3V8h5v8' }],
  ['path', { d: 'M11 12h5' }],
  ['rect', { x: '16', y: '2', width: '4', height: '12', rx: '1' }],
  ['path', { d: 'M18 14v7' }],
]

/* compact body with the cab over the wheelbase, one straight lift arm, the bucket as a closed wedge on the frame line */
const loader: GlyphNode = [
  ['path', { d: 'M13.5 16H2v-4h4.5V8h5v8' }],
  ['path', { d: 'M11.5 10l8 4' }],
  ['path', { d: 'M19.5 11V16H22z' }],
  ['circle', { cx: '4.5', cy: '18.5', r: '2.5' }],
  ['circle', { cx: '13.5', cy: '18.5', r: '2.5' }],
]

const lightVehicle: GlyphNode = [
  ['path', { d: 'M4 18.5H2V12h8V8h5l4 4h3v6.5h-2' }],
  ['path', { d: 'M9 18.5h6' }],
  ['circle', { cx: '6.5', cy: '18.5', r: '2.5' }],
  ['circle', { cx: '17.5', cy: '18.5', r: '2.5' }],
]

const person: GlyphNode = [
  ['path', { d: 'M8 7.5a4 4 0 0 1 8 0' }],
  ['path', { d: 'M6.5 7.5h11' }],
  ['path', { d: 'M8.5 7.5a3.5 3.5 0 0 0 7 0' }],
  ['path', { d: 'M4 21v-1.5a4.5 4.5 0 0 1 4.5-4.5h7a4.5 4.5 0 0 1 4.5 4.5V21' }],
]

const inclinometer: GlyphNode = [
  ['path', { d: 'M3 4h18' }],
  ['path', { d: 'M11 4v7l-3 4v6h5v-6l3-4V4' }],
]

const piezometer: GlyphNode = [
  ['path', { d: 'M2 7h7M15 7h7' }],
  ['path', { d: 'M9 3v18h6V3' }],
  ['rect', { x: '9', y: '12', width: '6', height: '9', fill: 'currentColor', stroke: 'none' }],
]

const prism: GlyphNode = [
  ['circle', { cx: '12', cy: '9', r: '6.5' }],
  ['path', { d: 'M12 9H8A4 4 0 0 1 12 5zM12 9h4a4 4 0 0 1-4 4z', fill: 'currentColor', stroke: 'none' }],
  ['path', { d: 'M12 15.5V21M9 21h6' }],
]

const totalStation: GlyphNode = [
  ['rect', { x: '8', y: '2', width: '8', height: '8', rx: '1.5' }],
  ['circle', { cx: '12', cy: '6', r: '1.5', fill: 'currentColor', stroke: 'none' }],
  ['path', { d: 'M12 10v3M7 13h10M9 13l-4 8M15 13l4 8M12 13v8' }],
]

const radar: GlyphNode = [
  ['path', { d: 'M6 9.5a4.95 4.95 0 0 0 7 7z' }],
  ['path', { d: 'M9.5 13l2.5-2.5' }],
  ['path', { d: 'M9.5 18v3M7 21h5' }],
  ['path', { d: 'M12 6.5a4 4 0 0 1 4 4' }],
  ['path', { d: 'M12 2.5a8 8 0 0 1 8 8' }],
]

const seismic: GlyphNode = [
  ['path', { d: 'M2 12h3l2-7 3.5 14 3.5-11.5 3 8 2.5-4.5 1.5 1h1' }],
]

export const PIT_GLYPH: Record<ObjectKind, GlyphNode> = {
  haulTruck,
  excavator,
  dozer,
  drillRig,
  loader,
  lightVehicle,
  person,
  inclinometer,
  piezometer,
  prism,
  totalStation,
  radar,
  seismic,
}
