/**
 * WebGL sources and layers of the operational overlay, bottom to top: zones, the blast and the
 * signal ripples. Object pins are HTML markers drawn above all of this (map/markers.ts).
 * No text layers: the style has no glyphs.
 */
import type * as maplibregl from 'maplibre-gl'
import type { AddLayerObject, ExpressionSpecification } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import { LEVEL_COLOR } from '@/config/levels'
import type { LayerGroup } from '@/engine/contract'

export const SRC = {
  zones: 'psm-zones',
  blasts: 'psm-blasts',
  pulses: 'psm-pulses',
} as const

export const L = {
  zoneFill: 'psm-zone-fill',
  blastFill: 'psm-blast-fill',
  zoneCasing: 'psm-zone-casing',
  zoneOutline: 'psm-zone-outline',
  zoneAttention: 'psm-zone-attention',
  zoneSelected: 'psm-zone-selected',
  blastBlock: 'psm-blast-block',
  blastRingVehicle: 'psm-blast-ring-vehicle',
  blastRingPeople: 'psm-blast-ring-people',
  pulses: 'psm-pulses',
} as const

/** Zone layers: visible only while every group they belong to is on. Object pins never hide (map/markers.ts). */
export const LAYER_GROUPS_OF: Partial<Record<string, LayerGroup[]>> = {
  [L.zoneFill]: ['zones'],
  [L.blastFill]: ['zones'],
  [L.zoneCasing]: ['zones'],
  [L.zoneOutline]: ['zones'],
  [L.zoneAttention]: ['zones'],
  [L.zoneSelected]: ['zones'],
  [L.blastBlock]: ['zones'],
  [L.blastRingVehicle]: ['zones'],
  [L.blastRingPeople]: ['zones'],
}

/** Click and hover targets on the canvas (a zone resolves to its owning instrument); pins handle their own. */
export const PICK_LAYERS = [L.zoneFill] as const

const C = LEVEL_COLOR
const NO_MATCH = '__none__'

const level = ['get', 'level'] as ExpressionSpecification
const levelColor = ['match', level, 'critical', C.critical.map, 'warning', C.warning.map, 'offline', C.offline.map, C.normal.map] as ExpressionSpecification
const armed = ['in', ['get', 'phase'], ['literal', ['armed', 'final']]] as ExpressionSpecification
const isPolygon = ['==', ['geometry-type'], 'Polygon'] as ExpressionSpecification

function layerList(): AddLayerObject[] {
  return [
    {
      id: L.zoneFill,
      type: 'fill',
      source: SRC.zones,
      paint: {
        'fill-color': levelColor,
        'fill-opacity': [
          'case',
          ['==', ['get', 'kind'], 'radar'],
          ['match', level, 'critical', 0.16, 'warning', 0.13, 0.08],
          ['match', level, 'critical', 0.3, 'warning', 0.24, 0.18],
        ],
      },
    },
    {
      id: L.blastFill,
      type: 'fill',
      source: SRC.blasts,
      filter: ['all', isPolygon, ['any', ['==', ['get', 'part'], 'block'], armed]],
      paint: {
        'fill-color': levelColor,
        'fill-opacity': ['match', ['get', 'part'], 'block', ['case', armed, 0.34, 0.2], 'peopleRing', 0.06, 0.08],
      },
    },
    {
      id: L.zoneCasing,
      type: 'line',
      source: SRC.zones,
      layout: { 'line-join': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': 4, 'line-opacity': 0.6 },
    },
    {
      id: L.zoneOutline,
      type: 'line',
      source: SRC.zones,
      layout: { 'line-join': 'round' },
      paint: { 'line-color': levelColor, 'line-width': ['case', ['==', ['get', 'kind'], 'radar'], 1.5, 2] },
    },
    {
      id: L.zoneAttention,
      type: 'line',
      source: SRC.zones,
      filter: ['==', ['get', 'attention'], true],
      layout: { 'line-join': 'round' },
      paint: { 'line-color': levelColor, 'line-width': 4, 'line-opacity': 1 },
    },
    {
      id: L.zoneSelected,
      type: 'line',
      source: SRC.zones,
      filter: ['==', ['get', 'sensorId'], NO_MATCH],
      layout: { 'line-join': 'round' },
      paint: { 'line-color': levelColor, 'line-width': 4.5 },
    },
    {
      id: L.blastBlock,
      type: 'line',
      source: SRC.blasts,
      filter: ['==', ['get', 'part'], 'block'],
      layout: { 'line-join': 'round' },
      paint: { 'line-color': levelColor, 'line-width': 2 },
    },
    {
      id: L.blastRingVehicle,
      type: 'line',
      source: SRC.blasts,
      filter: ['==', ['get', 'part'], 'vehicleRing'],
      paint: { 'line-color': levelColor, 'line-width': 2, 'line-dasharray': [2, 2], 'line-opacity': ['case', armed, 1, 0.6] },
    },
    {
      id: L.blastRingPeople,
      type: 'line',
      source: SRC.blasts,
      filter: ['==', ['get', 'part'], 'peopleRing'],
      paint: { 'line-color': levelColor, 'line-width': 2, 'line-dasharray': [5, 2.5], 'line-opacity': ['case', armed, 1, 0.6] },
    },
    {
      id: L.pulses,
      type: 'circle',
      source: SRC.pulses,
      paint: {
        'circle-radius': ['get', 'r'],
        'circle-color': ['get', 'c'],
        'circle-opacity': ['*', ['get', 'o'], 0.16],
        'circle-stroke-color': ['get', 'c'],
        'circle-stroke-width': ['get', 'w'],
        'circle-stroke-opacity': ['get', 'o'],
      },
    },
  ]
}

export function emptyCollection(): FeatureCollection {
  return { type: 'FeatureCollection', features: [] }
}

export function addLayers(map: maplibregl.Map) {
  removeLayers(map) // safe to call twice (hot reload)
  map.addSource(SRC.zones, { type: 'geojson', data: emptyCollection() })
  map.addSource(SRC.blasts, { type: 'geojson', data: emptyCollection() })
  map.addSource(SRC.pulses, { type: 'geojson', data: emptyCollection() })
  for (const layer of layerList()) map.addLayer(layer)
}

export function removeLayers(map: maplibregl.Map) {
  for (const id of Object.values(L).reverse()) if (map.getLayer(id)) map.removeLayer(id)
  for (const id of Object.values(SRC)) if (map.getSource(id)) map.removeSource(id)
}

/** Zones hide with their layer (object pins are handled by map/markers.ts). */
export function applyGroups(map: maplibregl.Map, groups: Record<LayerGroup, boolean>) {
  for (const [id, need] of Object.entries(LAYER_GROUPS_OF)) {
    if (!need || !map.getLayer(id)) continue
    map.setLayoutProperty(id, 'visibility', need.every((g) => groups[g]) ? 'visible' : 'none')
  }
}

/** Point the selected-zone outline at the zone owned by this instrument. */
export function setSelectedZone(map: maplibregl.Map, sensorId: string | null) {
  map.setFilter(L.zoneSelected, ['==', ['get', 'sensorId'], sensorId ?? NO_MATCH])
}
