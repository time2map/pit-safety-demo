import type { Map as MlMap } from 'maplibre-gl'

/** DEV only: click logs [lng, lat] and collects points into window.__pts */
export function installDevPicker(map: MlMap) {
  const w = window as unknown as { __pts: [number, number][]; __map: MlMap }
  w.__pts = []
  w.__map = map
  map.on('click', (e) => {
    if (!e.originalEvent.altKey) return
    const p: [number, number] = [+e.lngLat.lng.toFixed(6), +e.lngLat.lat.toFixed(6)]
    w.__pts.push(p)
    console.log('[pick]', JSON.stringify(p), 'n=', w.__pts.length)
  })
}
