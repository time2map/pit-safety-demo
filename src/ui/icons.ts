import type { Component } from 'vue'
import { createLucideIcon } from 'lucide-vue-next'
import { OBJECT_KINDS, type ObjectCategory, type ObjectKind } from '@/engine/contract'
import { PIT_GLYPH } from '@/map/glyphs'

/**
 * The map pins' own glyphs (map/glyphs.ts) as Vue icons, so panels, legend and map agree.
 * Signal rows, cards and toasts show the icon of the signal's subject (SignalIcon.vue).
 */
export const KIND_ICON = Object.fromEntries(
  OBJECT_KINDS.map((k) => [k, createLucideIcon(k, PIT_GLYPH[k])]),
) as Record<ObjectKind, Component>

/** one real pin glyph per category, for the legend, the layer toggles and the signal counters */
export const CATEGORY_ICON: Record<ObjectCategory, Component> = {
  vehicle: KIND_ICON.haulTruck,
  person: KIND_ICON.person,
  sensor: KIND_ICON.inclinometer,
}
