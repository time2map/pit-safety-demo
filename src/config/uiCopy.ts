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
    /** visible lead of the header counts, so they read as signals */
    signals: 'Signals',
    /** accessible name of the header counts */
    counts: 'Active signals',
    /** count first, so a badge reads as a number of signals and not as a status: "3 critical" */
    critical: (n: number) => `${n} critical`,
    warning: (n: number) => `${n} warning`,
    /** what a screen reader hears for each count: "3 critical signals", "1 warning signal" */
    criticalFull: (n: number) => plural(n, 'critical signal', 'critical signals'),
    warningFull: (n: number) => plural(n, 'warning signal', 'warning signals'),
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
    /** the object a signal is about, then when it opened or resolved: "IW-02, opened 2 min ago" */
    about: (label: string, when: string) => `${label}, ${lowerFirst(when)}`,
    resolvedAgo: (ago: string) => `Resolved ${lowerFirst(ago)}`,
    acknowledge: 'Acknowledge',
    showOnMap: 'Show on map',
    resolve: 'Resolve',
    steps: (done: number, total: number) => `${done} of ${total} steps`,
    stepsShort: (done: number, total: number) => `${done} of ${total}`,
    stepsDone: (done: number, total: number) => `${done} of ${total} response steps done`,
    responseSteps: 'Response steps',
    resolveHint: 'Resolve unlocks when the condition clears or every step is done',
    liveData: (label: string) => `${label} live data`,
    details: 'Details',
    detailsOf: (label: string) => `Open ${label} details`,
    involved: 'Involved',
    people: (n: number) => plural(n, 'person', 'people'),
    vehicles: (n: number) => plural(n, 'vehicle', 'vehicles'),
  },

  search: {
    label: 'Search objects',
    placeholder: 'Find a vehicle, person or instrument',
    clear: 'Clear search',
    results: 'Objects found',
    count: (n: number) => (n ? plural(n, 'object found', 'objects found') : 'No objects found'),
    empty: 'Nothing matches. Try an id like DZ-02, a name or a kind like borehole.',
    more: (n: number) => `${plural(n, 'more match', 'more matches')}, type more to narrow it down`,
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
    /** heading of the object's own part of its card, under its related signals */
    liveData: 'Live data',
    noReadings: 'No readings in the last 30 min',
  },

  map: {
    toolbar: 'Map controls',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    resetNorth: 'Reset north',
    fitSite: 'Fit site',
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

  attribution: {
    label: 'Map attribution',
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
    ripple: 'Ripples around what a new signal is about',
    problem: 'Vehicle or person at warning or critical',
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
      'Find any vehicle, person or instrument with the search at the top',
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
