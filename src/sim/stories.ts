/**
 * Scripted stories. Each story owns disjoint actors, instruments and zones, so they can run in parallel.
 * Beats fire at integer story seconds (tau); update() runs every logic tick while the story is running.
 */
import type { StoryId } from '@/engine/contract'
import { PEOPLE, STORY_ACTORS } from '@/data/fleet'
import type { Scripted, Truck } from './actors'
import { smooth } from './geo'
import type { Blast } from './zones'

export interface StoryCtx {
  /** current tick, sim seconds */
  t: number
  setDrive(sensorId: string, v: number): void
  /** narration line for a beat that is not on a fixed schedule */
  say(caption: string): void
  dozer: Scripted
  surveyor: Scripted
  fireTruck: Truck
  /** all haul trucks, so the fire truck can rejoin its route without stacking on another truck */
  trucks: readonly Truck[]
  blast: Blast
}

export interface Beat {
  at: number
  caption?: string
  run?: (c: StoryCtx) => void
}

export interface StoryDef {
  id: StoryId
  duration(fireIn: number): number
  beats(fireIn: number): Beat[]
  update?(c: StoryCtx, tau: number, memo: Record<string, number>): void
  /** back to baseline (also used before every start and on loop restart) */
  reset(c: StoryCtx): void
}

const SURVEYOR = PEOPLE.find((p) => p.id === STORY_ACTORS.surveyor)?.label ?? 'The surveyor'

/* Ground: IW-02 accelerates, DZ-02 drives into its zone, IW-02 turns critical, DZ-02 leaves, IW-02 decays. */
const G_DOZER_IN = 25
const G_CRIT = 42
const G_DOZER_OUT = 75
const G_DECAY = 205

/** extra displacement rate on IW-02 (mm/day) on top of its 1.3 baseline */
export function groundDrive(tau: number): number {
  if (tau < 0) return 0
  if (tau < 20) return 1.1 * smooth(tau / 20)
  if (tau < G_CRIT) return 1.1
  if (tau < G_CRIT + 10) return 1.1 + 1.0 * smooth((tau - G_CRIT) / 10)
  if (tau < G_DECAY) return 2.1
  if (tau < G_DECAY + 60) return 2.1 - 1.9 * smooth((tau - G_DECAY) / 60)
  return 0.2
}

function setGround(c: StoryCtx, d: number) {
  c.setDrive('IW-02', d)
  // neighbours feel it a little, never above their limits
  c.setDrive('P-02', 0.3 * d)
  c.setDrive('PZ-02', 8 * d)
  // the radar scans the same bench and corroborates the well with a low warning (about 2.15 mm/day at the peak)
  c.setDrive('SR-1', 0.45 * d)
}

const ground: StoryDef = {
  id: 'ground',
  duration: () => G_DECAY + 65,
  beats: () => [
    { at: 0, caption: 'IW-02 on the west wall is accelerating' },
    { at: G_DOZER_IN, caption: 'Dozer DZ-02 is heading into the IW-02 zone', run: (c) => c.dozer.go(1) },
    { at: G_CRIT, caption: 'IW-02 keeps accelerating with DZ-02 inside the zone' },
    { at: G_DOZER_OUT, caption: 'DZ-02 is ordered out of the IW-02 zone', run: (c) => c.dozer.go(0) },
    { at: G_DECAY, caption: 'IW-02 is slowing down' },
  ],
  update: (c, tau) => setGround(c, groundDrive(tau)),
  reset: (c) => {
    setGround(c, 0)
    c.dozer.home()
  },
}

/* Blast: B-1 armed, the surveyor walks into the people ring, final countdown, surveyor walks out, fire, all clear. */
const blast: StoryDef = {
  id: 'blast',
  duration: (fireIn) => fireIn + 50,
  beats: (fireIn) => [
    { at: 0, caption: 'Blast B-1 is armed, the exclusion zone is live', run: (c) => c.blast.arm(c.t, fireIn) },
    {
      at: Math.max(5, fireIn - 150),
      caption: `Surveyor ${SURVEYOR} is walking into the B-1 exclusion zone`,
      run: (c) => c.surveyor.go(1),
    },
    { at: fireIn - 60, caption: 'Final countdown for B-1 with the surveyor still inside' },
    { at: fireIn - 45, caption: `${SURVEYOR} is leaving the exclusion zone`, run: (c) => c.surveyor.go(0) },
    { at: fireIn, caption: 'Blast B-1 fired' },
    { at: fireIn + 30, caption: 'All clear, B-1 is safe to enter' },
  ],
  reset: (c) => {
    c.blast.reset()
    c.surveyor.home()
  },
}

/*
 * Fire: HT-104 engine bay heats up, fire is detected, suppression releases, truck pulls over, fire out.
 * The fire breaks out from F_FIRE on, as soon as the truck is driving on the open haul road (so it can pull over).
 * Until then the engine bay holds at F_HOLD, above the warning limit and below the critical limit, and the
 * truck cuts any loading or dumping stop short, so the fire follows the start within seconds.
 * If the truck has not reached the road by F_LATEST (it always has in practice), the heat-up is called off.
 * The story starts at 120 s in autoplay, so F_LATEST + F_BURN + 10 must stay under about 235.
 */
const F_FIRE = 15
const F_LATEST = 90
const F_BURN = 90
const F_HOLD = 112

const fire: StoryDef = {
  id: 'fire',
  duration: () => F_LATEST + F_BURN + 10,
  beats: () => [{ at: 0, caption: 'HT-104 engine bay is heating up on haul road A' }],
  update: (c, tau, memo) => {
    const tr = c.fireTruck
    memo.t0 ??= tr.temp
    if (memo.calledOff) return
    if (memo.fire === undefined) {
      if (tau >= F_FIRE && tr.onRoad) {
        memo.fire = tau
        memo.t1 = tr.temp
        tr.ignite()
        c.say('Fire on HT-104, suppression released, the truck pulls over')
      } else if (tau >= F_LATEST) {
        memo.calledOff = 1
        tr.forcedTemp = null
        return
      } else {
        const t0 = memo.t0
        tr.forcedTemp = t0 + (F_HOLD - t0) * Math.pow(Math.min(1, tau / F_FIRE), 1.4)
        tr.hurry()
        return
      }
    }
    const k = tau - memo.fire
    if (k === F_BURN) {
      tr.extinguish()
      c.say('Fire on HT-104 is out, the truck is out of service')
    } else if (k < F_BURN) {
      tr.forcedTemp = k <= 6 ? memo.t1 + (142 - memo.t1) * smooth(k / 6) : 75 + 67 * Math.exp(-(k - 6) / 18)
    }
  },
  reset: (c) => c.fireTruck.restore(c.trucks),
}

/*
 * Seismic: a tremor shakes the pit (SS-1 above its critical limit, not a blast), then prism P-04 on the
 * north west wall speeds up past its warning limit and settles. Manual only, not part of the autoplay loop.
 */
const Q_PEAK = 31
/** seconds at the peak, so at least two 3 s samples of SS-1 catch it */
const Q_SHAKE = 8
const Q_PRISM_AT = 10
const Q_PRISM_RISE = 12
const Q_PRISM_HOLD = 75
const Q_PRISM_SETTLE = 30
/** extra mm/day on P-04 (1.1 baseline), above the 2 mm/day warning limit */
const Q_PRISM = 1.4

/** extra peak particle velocity on SS-1 (mm/s) */
export function quakeDrive(tau: number): number {
  if (tau < 0) return 0
  if (tau < Q_SHAKE) return Q_PEAK
  return Q_PEAK * Math.exp(-(tau - Q_SHAKE) / 3)
}

function prismDrive(tau: number): number {
  if (tau < Q_PRISM_AT) return 0
  if (tau < Q_PRISM_AT + Q_PRISM_RISE) return Q_PRISM * smooth((tau - Q_PRISM_AT) / Q_PRISM_RISE)
  if (tau < Q_PRISM_HOLD) return Q_PRISM
  if (tau < Q_PRISM_HOLD + Q_PRISM_SETTLE) return Q_PRISM * (1 - smooth((tau - Q_PRISM_HOLD) / Q_PRISM_SETTLE))
  return 0
}

const seismic: StoryDef = {
  id: 'seismic',
  duration: () => Q_PRISM_HOLD + Q_PRISM_SETTLE + 10,
  beats: () => [
    { at: 0, caption: 'SS-1 registers a ground tremor, not a blast' },
    { at: Q_PRISM_AT + 6, caption: 'Prism P-04 on the north west wall speeds up after the tremor' },
    { at: Q_PRISM_HOLD, caption: 'P-04 is settling back' },
  ],
  update: (c, tau) => {
    c.setDrive('SS-1', quakeDrive(tau))
    c.setDrive('P-04', prismDrive(tau))
  },
  reset: (c) => {
    c.setDrive('SS-1', 0)
    c.setDrive('P-04', 0)
  },
}

export const STORIES: Record<StoryId, StoryDef> = { ground, blast, fire, seismic }
export const STORY_IDS: StoryId[] = ['ground', 'blast', 'fire', 'seismic']
