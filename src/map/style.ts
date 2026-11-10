import type { StyleSpecification } from 'maplibre-gl'

export type Basemap = 'satellite' | 'light'

export const ATTRIBUTION = {
  satellite: 'Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community',
  light: 'Esri, HERE, Garmin, &copy; OpenStreetMap contributors, and the GIS user community',
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
      light: {
        type: 'raster',
        // light grey canvas without labels, no key needed
        tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'],
        tileSize: 256,
        maxzoom: 16,
        attribution: ATTRIBUTION.light,
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
      {
        id: 'base-light',
        type: 'raster',
        source: 'light',
        layout: { visibility: 'none' },
        paint: { 'raster-fade-duration': 150 },
      },
    ],
  }
}
