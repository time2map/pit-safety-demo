/**
 * Glyphs of the map pins: the demo's own pit icons (map/glyphs.ts), turned into SVG by map/markers.ts.
 * ui/icons.ts wraps the same nodes as Vue components for the panels, so map and panels agree.
 */
import { VEHICLE_KINDS, type ObjectCategory, type ObjectKind } from '@/engine/contract'
import { PIT_GLYPH, type GlyphNode } from './glyphs'

export const GLYPH: Record<ObjectKind, GlyphNode> = PIT_GLYPH

export function categoryOf(kind: ObjectKind): ObjectCategory {
  if (kind === 'person') return 'person'
  return (VEHICLE_KINDS as string[]).includes(kind) ? 'vehicle' : 'sensor'
}
