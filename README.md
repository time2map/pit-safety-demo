# Pit Safety Monitor

A frontend-only demo of real-time safety monitoring at an open-pit mine. Real terrain in central Europe, fictional operations, simulated data. No backend and no login.

Live demo: https://time2map.github.io/pit-safety-demo/

What it shows:

- Haul trucks, support equipment and people moving on the map; like a tracking feed, their positions refresh every 2 seconds rather than gliding
- Slope instruments (inclinometer wells, piezometers, prisms, slope radar) with live readings and ground movement zones
- A blast exclusion zone with an armed countdown, people and equipment rings
- Signals generated from the simulation: zone entries, limit exceedances, a haul truck fire, a seismic event, instruments not reporting; until someone acknowledges a signal, the pins it involves carry a small bell badge in the corner
- One panel on the left, under the product header: the signal list, and an event card for each signal with what happened, its response steps right under the header (ticking any step of a new signal also acknowledges it), the subject's live data, who is involved, and the acknowledge and resolve actions; clicking an object on the map centres the view on it (no animation) and opens its card in the same panel
- Follow mode: selecting a vehicle or person keeps it in the middle of the view as it moves; dragging the map lets go, and Follow or F picks it up again
- Layers: every pin on a layer that is on has one size (34 px), in a signal or not; turning an object layer off shrinks its pins to small ones, icon included, instead of hiding them, while anything in a signal stays full size

## Run

```bash
npm install
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

## For the presenter

The demo starts in autoplay: a six minute loop runs three stories (slope movement, blast, truck fire) and starts again. The seismic event story is not in the loop: turn autoplay off and start it from the dock or with key 4.

| Key | Action |
|---|---|
| Space | Pause or resume |
| 1 | Start the slope movement story |
| 2 | Start the blast story |
| 3 | Start the truck fire story |
| 4 | Start the seismic event story (a tremor on the seismograph, then a prism on the north west wall speeds up) |
| R | Reset the scene |
| H | Hide or show the presenter dock |
| F | Stop following the selected vehicle or person, or follow it again (selecting one follows it; dragging the map lets go) |
| Esc | Back one step in the left panel (card to card, last card to the signal list) |

URL options:

| Option | Effect |
|---|---|
| `?mode=manual` | No autoplay, stories start from the dock or the keys above |
| `?speed=2` | Start at 2x (1, 2 or 4) |
| `?t=180` | Start three minutes into the loop |
| `?dock=0` | Start with the presenter dock hidden |
| `?lowfx=1` | No glass blur, for slow laptops |
| `?debug=1` | Frame rate counter |

Before a show: open the link once on the venue network so the satellite tiles are cached, and keep a phone hotspot as a fallback.

## Stack

Vue 3, Vite, TypeScript, Tailwind CSS 4, reka-ui, MapLibre GL. The simulation in `src/sim` is plain TypeScript and deterministic, covered by `tests/scenario.spec.ts`.

Imagery: Esri World Imagery. Light basemap: CARTO, OpenStreetMap contributors.
