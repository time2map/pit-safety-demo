import type { StyleSpecification } from 'maplibre-gl'

/** shown by the i button in the bottom right (ui/MapAttribution.vue); the MapLibre attribution control is off */
export const ATTRIBUTION = {
  satellite: 'Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community',
}

export function baseStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      satellite: {
        type: 'raster',
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        maxzoom: 19,
        attribution: ATTRIBUTION.satellite,
      },
    },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#e7e5e4' } },
      {
        id: 'base-satellite',
        type: 'raster',
        source: 'satellite',
        paint: { 'raster-saturation': -0.3, 'raster-contrast': 0.05, 'raster-fade-duration': 150 },
      },
    ],
  }
}
