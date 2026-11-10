/**
 * Every piece of UI chrome text (labels, buttons, empty states, legend, intro).
 * Domain wording (kinds, signal titles, checklists) lives in copy.ts.
 * Style: sentence case, no long dashes, no dot separators, no all caps.
 */
import type { LayerGroup, SignalStatus } from '@/engine/contract'
import { PRODUCT } from './copy'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
/** "Just now" reads "just now" inside a sentence */
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

export const UI = {
  brand: {
    ...PRODUCT,
    markLabel: 'Pit Safety Monitor mark',
  },

  kpi: {
    region: 'Site status',
    siteTime: 'Site time',
    equipment: 'Equipment',
    equipmentValue: (on: number, total: number) => `${on} of ${total} online`,
    people: 'People',
    peopleValue: (n: number) => `${n} on site`,
    sensors: 'Sensors',
    sensorsValue: (on: number, total: number) => `${on} of ${total} reporting`,
    critical: 'Critical',
    warning: 'Warning',
    nextBlast: 'Next blast',
    noBlast: 'No blast planned',
    blastIn: (label: string, dur: string) => `${label} in ${dur}`,
    blastFiring: (label: string) => `${label} firing now`,
    blastFired: (label: string, ago: string) => `${label} fired ${ago} ago`,
  },

  signals: {
    title: 'Signals',
    filter: 'Signal filter',
    active: 'Active',
    resolved: 'Resolved',
    emptyActive: 'No active signals',
    emptyActiveHint: 'Everything on site is within limits',
    emptyResolved: 'Nothing resolved yet',
    emptyResolvedHint: 'Signals you resolve are kept here',
    status: { new: 'New', acknowledged: 'Acknowledged', resolved: 'Resolved' } satisfies Record<SignalStatus, string>,
    opened: (ago: string) => `Opened ${lowerFirst(ago)}`,
    resolvedAgo: (ago: string) => `Resolved ${lowerFirst(ago)}`,
    acknowledge: 'Acknowledge',
    showOnMap: 'Show on map',
    resolve: 'Resolve',
    steps: (done: number, total: number) => `${done} of ${total} steps`,
    stepsShort: (done: number, total: number) => `${done} of ${total}`,
    stepsDone: (done: number, total: number) => `${done} of ${total} response steps done`,
    responseSteps: 'Response steps',
    resolveHint: 'Resolve unlocks when the condition clears or every step is done',
    conditionActive: 'Condition still present',
    conditionCleared: 'Condition cleared',
    liveData: (label: string) => `${label} live data`,
    details: 'Details',
    detailsOf: (label: string) => `Open ${label} details`,
    involved: 'Involved',
    people: (n: number) => plural(n, 'person', 'people'),
    vehicles: (n: number) => plural(n, 'vehicle', 'vehicles'),
  },

  outlet: {
    nav: 'Card navigation',
    back: 'Back',
    backTo: (label: string) => `Back to ${label}`,
    signal: 'Signal',
    toSignal: 'Back to the signal',
    toList: 'Back to signals',
    closeAll: 'Close and show all signals',
  },

  follow: {
    label: 'Follow',
    start: (label: string) => `Keep the map on ${label}`,
    stop: 'Stop following',
  },

  time: {
    justNow: 'Just now',
    ago: (span: string) => `${span} ago`,
    updated: (span: string) => `Updated ${span}`,
    updatedNow: 'Updated just now',
    unit: { h: 'h', min: 'min', s: 's' },
  },

  detail: {
    chartWindow: 'Last 30 min',
    now: 'Now',
    warnLimit: 'Warning limit',
    critLimit: 'Critical limit',
    readings: 'Readings',
    depths: 'Displacement by depth',
    depthUnit: 'm',
    occupants: 'Inside the zone now',
    related: 'Related signals',
    noReadings: 'No readings in the last 30 min',
  },

  map: {
    toolbar: 'Map controls',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    resetNorth: 'Reset north',
    fitSite: 'Fit site',
    basemap: 'Basemap',
    satellite: 'Satellite',
    light: 'Light',
    layers: 'Layers',
    layersTitle: 'Map layers',
    layersHint: 'A layer that is off shows its objects as small pins. Anything in a signal stays full size.',
    layer: {
      vehicles: 'Vehicles',
      people: 'People',
      sensors: 'Instruments',
      zones: 'Zones',
    } satisfies Record<LayerGroup, string>,
  },

  legend: {
    title: 'Legend',
    status: 'Status',
    objects: 'Objects',
    zones: 'Zones',
    vehicles: 'Vehicles',
    people: 'People',
    instruments: 'Instruments',
    groundZone: 'Ground movement zone',
    blastPeople: 'Blast exclusion zone, people ring',
    blastEquipment: 'Blast exclusion zone, equipment ring',
    zoneColourNote: 'Zone colour follows the instrument or blast status',
    unacknowledged: 'Signal not acknowledged yet',
    layerOff: 'Object on a layer that is off',
  },

  dock: {
    region: 'Presenter controls',
    play: 'Play',
    pause: 'Pause',
    speed: 'Simulation speed',
    autoplay: 'Autoplay',
    autoplayHint: 'Slope movement, blast and truck fire run on their own in a loop',
    stories: 'Scenarios',
    storiesLocked: 'Turn off autoplay to start scenarios yourself',
    reset: 'Reset simulation',
    hide: 'Hide presenter controls',
    show: 'Show presenter controls',
  },

  intro: {
    title: 'A live mine, simulated',
    body: 'This demo follows an open-pit coal mine in real time, with every vehicle, person and slope instrument on the map.',
    lines: [
      'Signals appear on the left as situations develop',
      'Click any truck, person or instrument for its live data',
      'Open a signal to see its response steps and tick them off',
    ],
    ok: 'Got it',
  },

  toast: {
    open: 'Open',
    region: 'Critical signals',
  },

  hotkeys: {
    space: 'Space',
  },
}
