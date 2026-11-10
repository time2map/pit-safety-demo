/**
 * MapLibre implementation of MapAdapter (see ./api.ts). Zones, the blast and ripples are WebGL
 * layers (./layers.ts); vehicles, people and instruments are HTML markers (./markers.ts).
 */
import type * as maplibregl from 'maplibre-gl'
import type { Feature, FeatureCollection, Point } from 'geojson'
import { LEVEL_COLOR } from '@/config/levels'
import { SITE } from '@/config/site'
import { LAYER_GROUPS, type LayerGroup, type Level, type LngLat, type MapFrame, type Pulse } from '@/engine/contract'
import type { MapAdapter } from './api'
import { FOLLOW_MOVE, installInteractions } from './interactions'
import { L, SRC, addLayers, applyGroups, removeLayers, setSelectedZone } from './layers'
import { createPins } from './markers'

type FrameKey = keyof MapFrame['versions']
/** collections drawn as WebGL layers; actors and sensors become markers */
type LayerKey = 'zones' | 'blasts'
const LAYER_KEYS: LayerKey[] = ['zones', 'blasts']

/** Two expanding waves per pulse. Seconds and pixels. The waves start at the edge of a 28 px pin, which sits above them. */
const PULSE = {
  small: { total: 1.8, wave: 1.2, gap: 0.6, r0: 14, r1: 54, w: 2.5 },
  big: { total: 3.4, wave: 2.3, gap: 1.1, r0: 18, r1: 120, w: 3.5 },
}
/**
 * A pin whose signal nobody has acknowledged yet sends out one slow wave at a time, from the pin edge
 * to the small pulse radius: the wave takes `wave` seconds, then a short rest, one cycle every `period`.
 */
const LOOP = { wave: 2, period: 2.8 }
/** with reduced motion the loop is one still ring at this radius (px) instead */
const STILL_R = 22
/** the signals panel ends this far left of the padding the camera keeps clear (see engine padding()) */
const PANEL_GUTTER = 32
const MAX_PULSES = 24

const easeOut = (t: number) => 1 - (1 - t) ** 3

/** Follow camera: the zoom it eases in to from further out, and how fast it settles on the object (seconds). */
const FOLLOW_ZOOM = 16
const FOLLOW_TAU = 0.25
const PAN_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])

type Padding = { top: number; right: number; bottom: number; left: number }

export async function createMapAdapter(map: maplibregl.Map): Promise<MapAdapter> {
  if (!map.style?._loaded) await map.once('style.load')

  addLayers(map)

  const source = (id: string) => map.getSource(id) as maplibregl.GeoJSONSource
  const frameSources: Record<LayerKey, maplibregl.GeoJSONSource> = {
    zones: source(SRC.zones),
    blasts: source(SRC.blasts),
  }
  const pulseSource = source(SRC.pulses)
  const seen: Record<FrameKey, number> = { actors: NaN, sensors: NaN, zones: NaN, blasts: NaN }
  const groups = Object.fromEntries(LAYER_GROUPS.map((g) => [g, true])) as Record<LayerGroup, boolean>
  let padding: Padding = { top: 0, right: 0, bottom: 0, left: 0 }
  let selected: string | null = null
  let pickCb: ((id: string | null) => void) | null = null
  let destroyed = false
  // the settle callback reaches onPinSettle (defined below) only after a pointer release, long after setup
  const pins = createPins(map, (id) => pickCb?.(id), (id) => onPinSettle(id))

  const noop = () => {}
  const push = (src: maplibregl.GeoJSONSource, data: FeatureCollection) => {
    void src.setData(data).catch(noop)
  }

  /* ---------------- attention breathing ---------------- */

  let hasAttention = false
  let attnRaf = 0
  let attnT0 = 0
  let attnLast = -1

  const attnTick = (now: number) => {
    // 0.5 Hz between 0.35 and 1
    const v = Math.round((0.675 + 0.325 * Math.cos(((now - attnT0) / 1000) * Math.PI)) * 100) / 100
    if (v !== attnLast) {
      attnLast = v
      map.setPaintProperty(L.zoneAttention, 'line-opacity', v)
    }
    attnRaf = requestAnimationFrame(attnTick)
  }

  const syncAttention = () => {
    const run = hasAttention && groups.zones && !destroyed
    if (run && !attnRaf) {
      attnT0 = performance.now()
      attnRaf = requestAnimationFrame(attnTick)
    } else if (!run && attnRaf) {
      cancelAnimationFrame(attnRaf)
      attnRaf = 0
      attnLast = -1
      if (!destroyed) map.setPaintProperty(L.zoneAttention, 'line-opacity', 1)
    }
  }

  /* ---------------- pulses ---------------- */

  /** one-off ripples (blast firing, a tremor): short-lived, so redrawn by data each frame while they run */
  const live: { p: Pulse; t0: number }[] = []
  let pulseRaf = 0

  const pulseTick = (now: number) => {
    pulseRaf = 0
    if (destroyed) return
    const features: Feature<Point>[] = []
    for (let i = live.length - 1; i >= 0; i--) {
      const { p, t0 } = live[i]!
      const s = p.big ? PULSE.big : PULSE.small
      const age = (now - t0) / 1000
      if (age >= s.total) {
        live.splice(i, 1)
        continue
      }
      for (let w = 0; w < 2; w++) {
        const k = (age - w * s.gap) / s.wave
        if (k <= 0 || k >= 1) continue
        features.push({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: p.lngLat },
          properties: { r: s.r0 + (s.r1 - s.r0) * easeOut(k), o: Math.round((1 - k) ** 1.5 * 90) / 100, w: s.w, c: LEVEL_COLOR[p.level].map },
        })
      }
    }
    push(pulseSource, { type: 'FeatureCollection', features })
    if (live.length) pulseRaf = requestAnimationFrame(pulseTick)
  }

  /* ---------------- looping ripples ---------------- */

  /**
   * Pins whose signal nobody has acknowledged yet (props.ripple), by id, at the position their pin shows.
   * The source holds one still point per pin and changes only when that set, a level or a position does
   * (at most once per position poll). The wave is one layer whose radius and opacity are set as plain
   * values each frame from one shared clock, like the zone attention breathing, so the animation costs
   * no tile reloads. All pins ripple in step.
   */
  const looping = new Map<string, { at: LngLat; level: Level; from: 'actors' | 'sensors' }>()
  const loopSource = source(SRC.loops)
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let loopKey = ''
  let loopRaf = 0
  let loopT0 = 0
  /** last value written per layer and property, so unchanged values are not sent again */
  const loopPaint = new Map<string, number>()

  const setLoopPaint = (layer: string, prop: 'circle-radius' | 'circle-opacity' | 'circle-stroke-opacity', v: number) => {
    const k = `${layer}|${prop}`
    if (loopPaint.get(k) === v) return
    loopPaint.set(k, v)
    map.setPaintProperty(layer, prop, v)
  }

  /** the wave at `phase` seconds into the cycle; opacity 0 during the rest */
  const paintWave = (phase: number) => {
    const s = PULSE.small
    const k = phase / LOOP.wave
    const on = k > 0 && k < 1
    const o = on ? Math.round((1 - k) ** 1.5 * 90) / 100 : 0
    if (on) setLoopPaint(L.loop, 'circle-radius', Math.round((s.r0 + (s.r1 - s.r0) * easeOut(k)) * 2) / 2)
    setLoopPaint(L.loop, 'circle-stroke-opacity', o)
    setLoopPaint(L.loop, 'circle-opacity', Math.round(o * 16) / 100)
  }

  const loopTick = (now: number) => {
    loopRaf = 0
    if (destroyed || !looping.size) return
    paintWave(((now - loopT0) / 1000) % LOOP.period)
    loopRaf = requestAnimationFrame(loopTick)
  }

  /** start, stop or still the loop to match the flagged pins and the motion preference */
  const runLoop = () => {
    if (destroyed) return
    const animate = looping.size > 0 && !reducedMotion.matches
    if (animate && !loopRaf) {
      loopT0 = performance.now()
      loopRaf = requestAnimationFrame(loopTick)
    } else if (!animate && loopRaf) {
      cancelAnimationFrame(loopRaf)
      loopRaf = 0
    }
    if (!animate) {
      // reduced motion: one still ring per pin instead of the wave
      const on = looping.size > 0
      setLoopPaint(L.loop, 'circle-radius', STILL_R)
      setLoopPaint(L.loop, 'circle-stroke-opacity', on ? 0.7 : 0)
      setLoopPaint(L.loop, 'circle-opacity', on ? 0.1 : 0)
    }
  }

  const writeLoops = () => {
    const features: Feature<Point>[] = []
    for (const r of looping.values()) {
      features.push({ type: 'Feature', geometry: { type: 'Point', coordinates: r.at }, properties: { c: LEVEL_COLOR[r.level].map } })
    }
    const key = features.map((f) => `${f.geometry.coordinates.join()}|${f.properties!.c}`).join(';')
    if (key !== loopKey) {
      loopKey = key
      push(loopSource, { type: 'FeatureCollection', features })
    }
    runLoop()
  }

  /** take the flagged pins of a collection that changed, where their pins show them (a held pin waits) */
  const syncLooping = (from: 'actors' | 'sensors', features: { properties: { id: string; ripple?: Level }; geometry: { coordinates: number[] } }[]) => {
    const flagged = new Set<string>()
    for (const f of features) {
      const { id, ripple } = f.properties
      if (!ripple) continue
      flagged.add(id)
      looping.set(id, { at: pins.shownAt(id) ?? (f.geometry.coordinates as LngLat), level: ripple, from })
    }
    for (const [id, r] of looping) if (r.from === from && !flagged.has(id)) looping.delete(id)
    writeLoops()
  }

  /** a pin held through a poll jumped to its new place on release: its ripple follows */
  const onPinSettle = (id: string) => {
    const r = looping.get(id)
    const at = pins.shownAt(id)
    if (!r || !at) return
    r.at = at
    writeLoops()
  }

  const onMotionPref = () => runLoop()
  reducedMotion.addEventListener('change', onMotionPref)

  /* ---------------- camera helpers ---------------- */

  /** Shrink the stored padding when the viewport is too small to honour it. */
  const fitPadding = (): Padding => {
    const c = map.getContainer()
    const sx = Math.min(1, Math.max(0, (c.clientWidth - 160) / Math.max(1, padding.left + padding.right)))
    const sy = Math.min(1, Math.max(0, (c.clientHeight - 160) / Math.max(1, padding.top + padding.bottom)))
    return { top: padding.top * sy, bottom: padding.bottom * sy, left: padding.left * sx, right: padding.right * sx }
  }

  const disposeInteractions = installInteractions(map, (id) => pickCb?.(id))

  /* ---------------- follow camera ---------------- */

  let followId: string | null = null
  let followEndCb: (() => void) | null = null
  /** next free frame is the first one: measure where the camera is and ease in when zoomed out */
  let followFresh = false
  let followLast = 0
  /** camera centre minus the object, in degrees; decays to zero so the camera glides onto it */
  let followOff: LngLat = [0, 0]
  /** position of the object the offset was measured against; a new poll fix moves it */
  let followAt: LngLat | null = null
  /** last centre the follow camera asked for, so a clamped centre (max bounds) is not re-sent every frame */
  let followAsked: LngLat | null = null

  /*
   * Pointers pressed on the map. Every camera call (jumpTo, easeTo) stops MapLibre's gesture
   * handlers, so the follow camera holds still while a button or finger is down; otherwise a
   * slow drag never starts and its release turns into a click.
   */
  const pressed = new Set<number>()
  const onPointerDown = (e: PointerEvent) => pressed.add(e.pointerId)
  const onPointerUp = (e: PointerEvent) => pressed.delete(e.pointerId)
  // a release outside the window is never reported: drop pointers that move with no button down
  const onPointerMove = (e: PointerEvent) => {
    if (e.buttons === 0) pressed.delete(e.pointerId)
  }
  const onBlur = () => pressed.clear()
  const canvasBox = map.getCanvasContainer()
  canvasBox.addEventListener('pointerdown', onPointerDown, true)
  window.addEventListener('pointerup', onPointerUp, true)
  window.addEventListener('pointercancel', onPointerUp, true)
  window.addEventListener('pointermove', onPointerMove, true)
  window.addEventListener('blur', onBlur)

  /** while following, wheel and pinch zoom around the middle, so the object stays where it is */
  const zoomAroundCenter = (on: boolean) => {
    for (const h of [map.scrollZoom, map.touchZoomRotate]) {
      // toggling a handler mid-gesture would drop the gesture; the next follow start or stop sets it
      if (!h.isEnabled() || h.isActive()) continue
      // enable() ignores new options while enabled
      h.disable()
      h.enable(on ? { around: 'center' } : undefined)
    }
  }

  const stopFollow = () => {
    if (followId === null) return
    followId = null
    followAsked = null
    followAt = null
    zoomAroundCenter(false)
  }

  /** the user pans: the camera is theirs again */
  const onUserPan = () => {
    if (followId === null) return
    stopFollow()
    followEndCb?.()
  }
  const onDragStart = (e: { originalEvent?: Event }) => {
    // a pinch drifts a few pixels too and reports a drag: only a one-finger or mouse pan ends following
    const o = e.originalEvent
    if (o && 'touches' in o && (o as TouchEvent).touches.length > 1) return
    onUserPan()
  }
  const onMoveStart = (e: { originalEvent?: Event }) => {
    const k = e.originalEvent
    if (k instanceof KeyboardEvent && PAN_KEYS.has(k.key) && !k.shiftKey) onUserPan()
  }
  map.on('dragstart', onDragStart)
  map.on('boxzoomstart', onUserPan)
  map.on('movestart', onMoveStart)

  const track = (frame: MapFrame) => {
    const f = frame.actors.features.find((x) => x.properties.id === followId)
    if (!f) return
    const [lng, lat] = f.geometry.coordinates as LngLat
    const now = performance.now()
    const dt = followLast ? Math.min(0.1, (now - followLast) / 1000) : 0
    followLast = now
    const c = map.getCenter()
    if (!followAt || followAt[0] !== lng || followAt[1] !== lat) {
      // the object jumped to its next polled position: start a glide from where the camera is
      followAt = [lng, lat]
      followOff = [c.lng - lng, c.lat - lat]
    }
    if (pressed.size || map.isMoving()) {
      // a press, a gesture or a camera animation has the camera: track the offset and glide back after it
      followOff = [c.lng - lng, c.lat - lat]
      followAsked = null
      return
    }
    if (followFresh) {
      followFresh = false
      followOff = [c.lng - lng, c.lat - lat]
      if (map.getZoom() < FOLLOW_ZOOM - 0.01) {
        // straight in, no animated zoom: HTML pins visibly jitter through a camera animation
        map.jumpTo({ center: [lng, lat], zoom: FOLLOW_ZOOM, padding: fitPadding() }, FOLLOW_MOVE)
        followOff = [0, 0]
        followAsked = [lng, lat]
        return
      }
    }
    const k = Math.exp(-dt / FOLLOW_TAU)
    followOff = [followOff[0] * k, followOff[1] * k]
    // settle within a fraction of a pixel, so the camera stops moving until the next poll
    if (Math.abs(followOff[0]) < 2e-6 && Math.abs(followOff[1]) < 2e-6) followOff = [0, 0]
    const x = lng + followOff[0]
    const y = lat + followOff[1]
    const last = followAsked ?? [c.lng, c.lat]
    if (Math.abs(x - last[0]) < 1e-9 && Math.abs(y - last[1]) < 1e-9) return
    followAsked = [x, y]
    map.jumpTo({ center: [x, y], padding: fitPadding() }, FOLLOW_MOVE)
  }

  const adapter: MapAdapter = {
    apply(frame) {
      if (destroyed) return
      for (const k of LAYER_KEYS) {
        const v = frame.versions[k]
        if (v === seen[k]) continue
        seen[k] = v
        push(frameSources[k], frame[k] as FeatureCollection)
        if (k === 'zones') {
          hasAttention = frame.zones.features.some((f) => f.properties?.attention)
          syncAttention()
        }
      }
      // instruments first: markers paint in creation order, so people and vehicles stay above the well they stand by
      for (const k of ['sensors', 'actors'] as const) {
        const v = frame.versions[k]
        if (v === seen[k]) continue
        seen[k] = v
        pins.update(frame[k].features)
        syncLooping(k, frame[k].features)
      }
      if (followId !== null) track(frame)
    },

    pulse(p) {
      if (destroyed) return
      live.push({ p, t0: performance.now() })
      if (live.length > MAX_PULSES) live.shift()
      if (!pulseRaf) pulseRaf = requestAnimationFrame(pulseTick)
    },

    select(id) {
      if (destroyed || id === selected) return
      pins.select(id)
      selected = id
      setSelectedZone(map, id)
    },

    setLayer(g, on) {
      if (destroyed) return
      groups[g] = on
      applyGroups(map, groups)
      pins.setGroups(groups)
      if (g === 'zones') syncAttention()
    },

    jumpTo(lngLat, zoom) {
      // instant, no flight: HTML pins visibly jitter through a camera animation. A closer zoom is kept
      // for a target already on screen, otherwise the camera goes to zoom 16
      const near = map.getBounds().contains(lngLat)
      map.jumpTo({ center: lngLat, zoom: zoom ?? (near ? Math.max(map.getZoom(), 16) : 16), padding: fitPadding() })
    },

    /* toolbar camera moves are instant as well: HTML pins visibly jitter through a camera animation */

    fitSite() {
      // absolutePadding: replace the padding a previous jump left on the map instead of adding to it
      map.fitBounds(SITE.fitBounds, { padding: fitPadding(), absolutePadding: true, duration: 0 })
    },

    zoomIn() {
      map.zoomIn({ duration: 0 })
    },

    zoomOut() {
      map.zoomOut({ duration: 0 })
    },

    resetNorth() {
      map.resetNorthPitch({ duration: 0 })
    },

    setPadding(p) {
      padding = { ...p }
      pins.setInsets({ top: p.top, left: Math.max(0, p.left - PANEL_GUTTER) })
    },

    onPick(cb) {
      pickCb = cb
    },

    follow(id) {
      if (destroyed || id === followId) return
      stopFollow()
      if (id === null) return
      followId = id
      followFresh = true
      followLast = 0
      followAt = null
      zoomAroundCenter(true)
    },

    onFollowEnd(cb) {
      followEndCb = cb
    },

    destroy() {
      if (destroyed) return
      destroyed = true
      syncAttention()
      cancelAnimationFrame(pulseRaf)
      pulseRaf = 0
      live.length = 0
      cancelAnimationFrame(loopRaf)
      loopRaf = 0
      looping.clear()
      reducedMotion.removeEventListener('change', onMotionPref)
      pickCb = null
      stopFollow()
      followEndCb = null
      map.off('dragstart', onDragStart)
      canvasBox.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('pointerup', onPointerUp, true)
      window.removeEventListener('pointercancel', onPointerUp, true)
      window.removeEventListener('pointermove', onPointerMove, true)
      window.removeEventListener('blur', onBlur)
      pressed.clear()
      map.off('boxzoomstart', onUserPan)
      map.off('movestart', onMoveStart)
      disposeInteractions()
      pins.destroy()
      try {
        removeLayers(map)
      } catch {
        // map already removed
      }
    },
  }

  return adapter
}
