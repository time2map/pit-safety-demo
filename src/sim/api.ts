/**
 * Public surface of the simulation. The engine (src/engine/engine.ts) only talks to this.
 * The implementation lives in src/sim/world.ts: `export function createWorld(opts): World`.
 * Everything in src/sim is plain TypeScript: no Vue, no DOM, no MapLibre.
 */
import type { LngLat, MapFrame, Pulse, Snapshot, StoryId } from '@/engine/contract'

export interface WorldOptions {
  seed: number
  /** 'auto' runs the looping director; 'manual' waits for triggerStory() */
  mode: 'auto' | 'manual'
  /** wall clock epoch (ms) that corresponds to t = 0 */
  epochMs: number
}

export interface World {
  /** sim seconds since start */
  readonly t: number
  /**
   * Advance by dt sim seconds. Internally uses a fixed 50 ms step with an accumulator,
   * so results do not depend on how dt is sliced. Logic (sensors, geofencing, signals) runs once per sim second.
   */
  step(dt: number): void
  /** fast-forward to sim time t (no-op if t <= current) */
  seek(t: number): void

  /**
   * Take a position fix of every actor for the map, as a client polling a tracking server would.
   * Actors keep moving between polls; the map frame and positionOf only show the last fix.
   * Called once on creation and after seek; the engine then calls it on its polling interval.
   */
  pollPositions(): void
  /** current map frame; collections are rebuilt only when their version changes */
  mapFrame(): MapFrame
  /** UI snapshot; speed, paused and following are filled in by the engine */
  snapshot(selectedId: string | null): Snapshot
  /** visual events since the last call (new or escalated signals, blast firing, the start of a tremor) */
  drainPulses(): Pulse[]

  /** current position of any object (actor, sensor, zone owner) for camera moves */
  positionOf(id: string): LngLat | null

  acknowledge(signalId: string): void
  toggleStep(signalId: string, stepId: string): void
  resolve(signalId: string): void
  setAutoplay(on: boolean): void
  readonly autoplay: boolean
  triggerStory(id: StoryId): void
}
