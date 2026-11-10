/**
 * Runs stories: the autoplay loop (fixed offsets inside a 360 s loop) and manual triggers.
 * Everything happens on logic ticks, so it is deterministic.
 */
import { STORY_TITLE } from '@/config/copy'
import type { StoryId, StoryView } from '@/engine/contract'
import { clamp } from './geo'
import { STORIES, STORY_IDS, type Beat, type StoryCtx } from './stories'

export const LOOP_LENGTH = 360
export const MANUAL_FIRE_IN = 120
const CAPTION_S = 12
/** a caption stays at least this long; captions arriving earlier wait their turn */
export const CAPTION_MIN_S = 6

/** loop seconds at which each story starts in autoplay; B-1 fires at 15 + 225 = 4:00 */
export const AUTO_PLAN: { id: StoryId; at: number; fireIn?: number }[] = [
  { id: 'ground', at: 5 },
  { id: 'blast', at: 15, fireIn: 225 },
  { id: 'fire', at: 120 },
]
const AUTO_BLAST = AUTO_PLAN[1]
const AUTO_FIRE_AT = AUTO_BLAST.at + (AUTO_BLAST.fireIn ?? MANUAL_FIRE_IN)

interface Run {
  id: StoryId
  t0: number
  beats: Beat[]
  next: number
  duration: number
  memo: Record<string, number>
}

export class Director {
  autoplay: boolean
  loopStart = 0
  caption: string | null = null
  private captionAt = 0
  private captionUntil = 0
  private captionQueue: string[] = []
  private readonly runs = new Map<StoryId, Run>()
  private readonly done = new Set<StoryId>()
  private pending: StoryId[] = []
  private restartPending = false

  constructor(autoplay: boolean) {
    this.autoplay = autoplay
  }

  /** off: no new stories start (running ones finish); on: the loop restarts from the beginning */
  setAutoplay(on: boolean) {
    if (on && !this.autoplay) this.restartPending = true
    this.autoplay = on
  }

  /** runs the story once from its start on the next tick */
  trigger(id: StoryId) {
    if (!this.pending.includes(id)) this.pending.push(id)
  }

  tick(t: number, c: StoryCtx) {
    if (this.restartPending) {
      this.restartPending = false
      this.restart(t, c)
    }
    if (this.autoplay) {
      if (t - this.loopStart >= LOOP_LENGTH) this.restart(t, c)
      const lt = t - this.loopStart
      for (const p of AUTO_PLAN) if (p.at === lt) this.start(p.id, t, c, p.fireIn ?? MANUAL_FIRE_IN)
    }
    const pending = this.pending
    this.pending = []
    for (const id of pending) this.start(id, t, c, MANUAL_FIRE_IN)

    for (const run of this.runs.values()) {
      const tau = t - run.t0
      while (run.next < run.beats.length && run.beats[run.next].at <= tau) {
        const b = run.beats[run.next++]
        b.run?.(c)
        if (b.caption) this.say(b.caption, t)
      }
      STORIES[run.id].update?.(c, tau, run.memo)
      if (tau >= run.duration) {
        this.runs.delete(run.id)
        this.done.add(run.id)
      }
    }
    if (this.captionQueue.length && t - this.captionAt >= CAPTION_MIN_S) this.show(this.captionQueue.shift()!, t)
    else if (this.caption !== null && t >= this.captionUntil) this.caption = null
  }

  /** shows the caption now, or queues it (FIFO) while the current one has had less than its minimum time */
  say(caption: string, t: number) {
    if (this.caption !== null && (this.captionQueue.length || t - this.captionAt < CAPTION_MIN_S)) this.captionQueue.push(caption)
    else this.show(caption, t)
  }

  private show(caption: string, t: number) {
    this.caption = caption
    this.captionAt = t
    this.captionUntil = t + CAPTION_S
  }

  private start(id: StoryId, t: number, c: StoryCtx, fireIn: number) {
    const def = STORIES[id]
    def.reset(c)
    this.runs.set(id, { id, t0: t, beats: def.beats(fireIn), next: 0, duration: def.duration(fireIn), memo: {} })
    this.done.delete(id)
  }

  private restart(t: number, c: StoryCtx) {
    for (const id of STORY_IDS) STORIES[id].reset(c)
    this.runs.clear()
    this.done.clear()
    this.caption = null
    this.captionQueue = []
    this.loopStart = t
  }

  loopT(t: number): number {
    return this.autoplay ? clamp(t - this.loopStart, 0, LOOP_LENGTH) : 0
  }

  views(t: number): StoryView[] {
    return STORY_IDS.map((id) => {
      const r = this.runs.get(id)
      const title = STORY_TITLE[id]
      if (r) return { id, title, state: 'running', progress: clamp((t - r.t0) / r.duration, 0, 1) }
      const done = this.done.has(id)
      return { id, title, state: done ? 'done' : 'idle', progress: done ? 1 : 0 }
    })
  }

  /** firing time of the next autoplay blast when none is armed */
  nextAutoFire(t: number): number | null {
    if (!this.autoplay) return null
    const lt = t - this.loopStart
    return lt < AUTO_BLAST.at ? this.loopStart + AUTO_FIRE_AT : this.loopStart + LOOP_LENGTH + AUTO_FIRE_AT
  }
}
