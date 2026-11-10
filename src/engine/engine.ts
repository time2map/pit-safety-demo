import { reactive, ref, shallowRef } from 'vue'
import type * as maplibregl from 'maplibre-gl'
import type { AppOptions } from '@/config/options'
import { createWorld } from '@/sim/world'
import type { World } from '@/sim/api'
import { createMapAdapter } from '@/map/adapter'
import type { MapAdapter } from '@/map/api'
import {
  FOLLOW_KINDS,
  LAYER_GROUPS,
  type EngineCommands,
  type LayerGroup,
  type MapControls,
  type MapFrame,
  type Snapshot,
} from './contract'
import type { AppContext } from './keys'
import { createOutlet } from './outlet'

/** Seconds of real time between UI snapshots. */
const SNAPSHOT_EVERY_MS = 500
/** Biggest real-time step fed into the world in one frame (tab was in background, debugger, etc). */
const MAX_FRAME_DT = 0.25
/**
 * Real-time interval between position polls. Vehicles and people move continuously in the
 * simulation, but the map shows them where the last poll found them, like a client polling a
 * tracking server: every marker jumps to its new place at the same moment.
 */
const POLL_MS = 2000

/**
 * Map padding that keeps the scene clear of the floating panels (see ui/Hud.vue):
 * the signals panel on the left (16 + 384 or 420 wide), the map controls column on the right
 * (16 + 40), the presenter dock at the bottom.
 */
function padding() {
  const wide = window.innerWidth >= 1600
  return {
    top: 24,
    right: 72,
    bottom: 72,
    left: wide ? 468 : 432,
  }
}

export interface Engine {
  context: AppContext
  attachMap(map: maplibregl.Map): Promise<void>
  start(): void
  stop(): void
  /** frames per second, for ?debug=1 */
  fps: () => number
}

export function createEngine(options: AppOptions): Engine {
  const epochMs = Date.now()
  let generation = 0
  let world: World = makeWorld()

  let speed: 1 | 2 | 4 = options.speed
  let paused = false
  let selectedId: string | null = null
  /** object the camera follows; always the selected one */
  let followId: string | null = null
  let adapter: MapAdapter | null = null
  let raf = 0
  let last = 0
  let lastSnap = 0
  let lastPoll = 0
  let fpsValue = 0
  let fpsFrames = 0
  let fpsSince = 0

  const snapshot = shallowRef<Snapshot>(decorate(world.snapshot(null)))
  const layers = reactive(Object.fromEntries(LAYER_GROUPS.map((g) => [g, true])) as Record<LayerGroup, boolean>)
  const dockVisible = ref(options.dock)
  const outlet = createOutlet({
    select: (id) => commands.select(id),
    focus: (id) => commands.focus(id),
    subjectOf: (signalId) => {
      const s = snapshot.value
      return (s.signalsActive.find((x) => x.id === signalId) ?? s.signalsResolved.find((x) => x.id === signalId))?.subject.id ?? null
    },
  })

  function makeWorld(): World {
    const w = createWorld({ seed: options.seed, mode: options.mode, epochMs })
    if (options.startT > 0) w.seek(options.startT)
    return w
  }

  function decorate(s: Snapshot): Snapshot {
    return { ...s, speed, paused, following: followId }
  }

  function publish() {
    snapshot.value = decorate(world.snapshot(selectedId))
    lastSnap = performance.now()
  }

  /** Versions restart from zero for a new world; offset them so the adapter always sees a change. */
  function frameForAdapter(): MapFrame {
    const f = world.mapFrame()
    const k = generation * 1_000_000
    return {
      ...f,
      versions: {
        actors: f.versions.actors + k,
        sensors: f.versions.sensors + k,
        zones: f.versions.zones + k,
        blasts: f.versions.blasts + k,
      },
    }
  }

  function pushToMap() {
    if (!adapter) {
      // nothing to animate yet: drop ripples so they do not all fire when the map attaches
      world.drainPulses()
      return
    }
    adapter.apply(frameForAdapter())
    for (const p of world.drainPulses()) adapter.pulse(p)
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame)
    const dt = last ? Math.min((now - last) / 1000, MAX_FRAME_DT) : 0
    last = now
    if (!paused && dt > 0) world.step(dt * speed)
    if (now - lastPoll >= POLL_MS) {
      world.pollPositions()
      lastPoll = now
    }
    pushToMap()
    if (now - lastSnap >= SNAPSHOT_EVERY_MS) publish()
    fpsFrames++
    if (now - fpsSince >= 1000) {
      fpsValue = (fpsFrames * 1000) / (now - fpsSince)
      fpsFrames = 0
      fpsSince = now
    }
  }

  /** stop the follow camera; the caller publishes */
  function unfollow() {
    if (followId === null) return
    followId = null
    adapter?.follow(null)
  }

  function onVisibility() {
    // rAF stops in background tabs; make sure the first frame back does not jump
    last = 0
  }

  /** something that drives or walks (not an excavator or an instrument) */
  function canFollow(id: string): boolean {
    const kind = snapshot.value.objects.find((o) => o.id === id)?.kind
    return !!kind && FOLLOW_KINDS.includes(kind)
  }

  /** put the camera on the selected object; the caller publishes */
  function startFollow(id: string) {
    if (!adapter || id === followId) return
    unfollow()
    followId = id
    adapter.setPadding(padding())
    adapter.follow(id)
  }

  const commands: EngineCommands = {
    select(id) {
      // the camera follows the selected object only
      if (id !== followId) unfollow()
      selectedId = id
      adapter?.select(id)
      // a moving object is followed as soon as it is selected; a pan, another selection, Fit site or closing its card lets go
      if (id !== null && canFollow(id)) startFollow(id)
      publish()
    },
    focus(id) {
      const following = id === followId
      commands.select(id)
      // a followed object is already in the middle of the map
      if (following) return
      // a newly followed object gets the jump too; the follow camera takes over from there
      const p = world.positionOf(id)
      if (p && adapter) {
        adapter.setPadding(padding())
        adapter.jumpTo(p)
      }
    },
    follow(id) {
      if (id === followId) return
      if (id === null) unfollow()
      else if (id === selectedId && canFollow(id)) startFollow(id)
      else return
      publish()
    },
    acknowledge(signalId) {
      world.acknowledge(signalId)
      publish()
    },
    toggleStep(signalId, stepId) {
      world.toggleStep(signalId, stepId)
      publish()
    },
    resolve(signalId) {
      world.resolve(signalId)
      publish()
    },
    setSpeed(s) {
      speed = s
      publish()
    },
    togglePause() {
      paused = !paused
      publish()
    },
    setAutoplay(on) {
      world.setAutoplay(on)
      publish()
    },
    triggerStory(id) {
      // starting a story by hand switches to presenter mode; running stories finish normally
      if (world.autoplay) world.setAutoplay(false)
      world.triggerStory(id)
      publish()
    },
    reset() {
      unfollow()
      generation++
      world = makeWorld()
      lastPoll = performance.now()
      if (!world.autoplay && options.mode === 'auto') world.setAutoplay(true)
      // a new run reuses signal ids, so cards from the old run must not stay open
      outlet.clear()
      selectedId = null
      adapter?.select(null)
      pushToMap()
      publish()
    },
  }

  const map: MapControls = {
    zoomIn: () => adapter?.zoomIn(),
    zoomOut: () => adapter?.zoomOut(),
    resetNorth: () => adapter?.resetNorth(),
    fitSite: () => {
      if (followId !== null) {
        unfollow()
        publish()
      }
      adapter?.setPadding(padding())
      adapter?.fitSite()
    },
    setLayer: (g, on) => {
      layers[g] = on
      adapter?.setLayer(g, on)
    },
  }

  if (import.meta.env.DEV) {
    // dev-only hook: advance the world by hand when the tab cannot animate (hidden preview pane)
    ;(window as unknown as Record<string, unknown>).__psd = {
      advance(seconds: number) {
        world.step(seconds)
        world.pollPositions()
        pushToMap()
        publish()
      },
      get t() {
        return world.t
      },
    }
  }

  async function attachMap(m: maplibregl.Map) {
    adapter = await createMapAdapter(m)
    adapter.onPick((id) => outlet.mapPick(id))
    adapter.onFollowEnd(() => {
      followId = null
      publish()
    })
    for (const g of LAYER_GROUPS) adapter.setLayer(g, layers[g])
    adapter.setPadding(padding())
    adapter.fitSite()
    pushToMap()
  }

  return {
    context: { snapshot, commands, map, layers, options, dockVisible, outlet },
    attachMap,
    start() {
      document.addEventListener('visibilitychange', onVisibility)
      last = 0
      fpsSince = performance.now()
      raf = requestAnimationFrame(frame)
    },
    stop() {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVisibility)
      adapter?.destroy()
    },
    fps: () => fpsValue,
  }
}
