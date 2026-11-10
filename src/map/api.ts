/**
 * Public surface of the map layer. Implementation: src/map/adapter.ts
 * `export function createMapAdapter(map: maplibregl.Map): Promise<MapAdapter>`
 * Resolves once the style is loaded and the zone, blast and ripple layers are added; object pins
 * (HTML markers, map/markers.ts) are created on the first apply().
 */
import type { LayerGroup, LngLat, MapFrame, Pulse } from '@/engine/contract'

export interface MapAdapter {
  /** push the latest frame; collections whose version did not change are skipped */
  apply(frame: MapFrame): void
  /** one-off ripple at a location (new or escalated signal, blast) */
  pulse(p: Pulse): void
  /** highlight one object (actor, sensor or zone owner) or clear */
  select(id: string | null): void
  setLayer(g: LayerGroup, on: boolean): void
  /** centre the camera on a point at once (no animation) */
  jumpTo(lngLat: LngLat, zoom?: number): void
  /** fit the whole site, at once */
  fitSite(): void
  zoomIn(): void
  zoomOut(): void
  resetNorth(): void
  /** padding (px) kept clear for floating panels when fitting / flying */
  setPadding(p: { top: number; right: number; bottom: number; left: number }): void
  /** click on an object (id) or on empty map (null) */
  onPick(cb: (id: string | null) => void): void
  /**
   * Keep the camera on an actor of the applied frames, or stop with null. The camera eases in,
   * zoom gestures zoom around it, and a pan by the user (drag, arrow keys, box zoom) ends it.
   */
  follow(id: string | null): void
  /** the user ended following by panning the map */
  onFollowEnd(cb: () => void): void
  destroy(): void
}
