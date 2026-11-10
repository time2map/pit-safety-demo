/** Site framing. Real terrain, fictional operations. */
export const SITE = {
  name: 'Demo pit',
  /** local metric origin for the simulation (approximate scene centre) */
  origin: { lng: 19.3125, lat: 51.2362 },
  center: [19.3125, 51.2362] as [number, number],
  initialZoom: 14.4,
  minZoom: 13,
  maxZoom: 18.5,
  /** [west, south, east, north] */
  maxBounds: [19.272, 51.216, 19.352, 51.256] as [number, number, number, number],
  /** area the camera fits on start and on "Fit site" */
  fitBounds: [19.2975, 51.228, 19.3318, 51.2421] as [number, number, number, number],
}
