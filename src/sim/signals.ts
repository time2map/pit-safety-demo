/**
 * Keyed signal reconciler. Each logic tick the world computes the desired signals;
 * the board opens, updates, escalates, de-escalates and resolves the active ones.
 */
import { CHECKLIST, SIGNAL_TITLE } from '@/config/copy'
import { LEVEL_RANK } from '@/config/levels'
import type { ChecklistStep, Level, LngLat, ObjectRef, SignalLevel, SignalStatus, SignalType, SignalView } from '@/engine/contract'

export const CALM_TICKS = 5
export const RESOLVE_TICKS = 5
export const REOPEN_WINDOW = 30
export const MAX_RESOLVED = 50

export interface Desired {
  key: string
  type: SignalType
  level: SignalLevel
  subject: ObjectRef
  place: string
  involved: ObjectRef[]
  valueText?: string
  /** pulse location */
  at: LngLat
}

export interface Signal {
  id: string
  key: string
  type: SignalType
  level: SignalLevel
  status: SignalStatus
  subject: ObjectRef
  place: string
  openedAt: number
  updatedAt: number
  resolvedAt?: number
  involved: ObjectRef[]
  valueText?: string
  steps: ChecklistStep[]
  conditionActive: boolean
  missing: number
  calm: number
}

export type TimelineEvent = 'open' | 'escalate' | 'deescalate' | 'reopen' | 'resolve'

export interface TimelineEntry {
  t: number
  key: string
  type: SignalType
  event: TimelineEvent
  level: SignalLevel
}

const rank = (l: Level) => LEVEL_RANK[l]
const idsOf = (refs: ObjectRef[]) => refs.map((r) => r.id).join(',')

export class SignalBoard {
  active: Signal[] = []
  resolved: Signal[] = []
  readonly log: TimelineEntry[] = []
  private seq = 0
  /** keys resolved by hand while the condition was still present: not reopened until it clears or escalates */
  private readonly muted = new Map<string, SignalLevel>()
  private readonly onPulse: (at: LngLat, level: Level) => void

  constructor(onPulse: (at: LngLat, level: Level) => void) {
    this.onPulse = onPulse
  }

  private record(t: number, s: Signal, event: TimelineEvent) {
    this.log.push({ t, key: s.key, type: s.type, event, level: s.level })
  }

  create(t: number, d: Desired, status: SignalStatus = 'new'): Signal {
    const s: Signal = {
      id: `sig-${++this.seq}`,
      key: d.key,
      type: d.type,
      level: d.level,
      status,
      subject: d.subject,
      place: d.place,
      openedAt: t,
      updatedAt: t,
      involved: d.involved,
      valueText: d.valueText,
      steps: CHECKLIST[d.type].map((label, i) => ({ id: `s${i + 1}`, label, done: false })),
      conditionActive: true,
      missing: 0,
      calm: 0,
    }
    return s
  }

  reconcile(t: number, desired: Desired[]) {
    const seen = new Set<string>()
    for (const d of desired) {
      seen.add(d.key)
      let s = this.active.find((a) => a.key === d.key)
      const mutedAt = this.muted.get(d.key)
      if (!s && mutedAt !== undefined) {
        if (rank(d.level) <= rank(mutedAt)) continue
        this.muted.delete(d.key)
      }
      if (!s) {
        const i = this.resolved.findIndex((r) => r.key === d.key && t - (r.resolvedAt ?? -Infinity) < REOPEN_WINDOW)
        if (i >= 0) {
          s = this.resolved.splice(i, 1)[0]
          Object.assign(s, { status: 'new', resolvedAt: undefined, level: d.level, updatedAt: t, missing: 0, calm: 0 })
          // the situation came back (often worse), so the response starts over
          for (const x of s.steps) x.done = false
          this.active.push(s)
          this.record(t, s, 'reopen')
        } else {
          s = this.create(t, d)
          this.active.push(s)
          this.record(t, s, 'open')
        }
        this.onPulse(d.at, d.level)
      } else if (rank(d.level) > rank(s.level)) {
        s.level = d.level
        s.calm = 0
        s.updatedAt = t
        if (d.level === 'critical') s.status = 'new'
        this.record(t, s, 'escalate')
        this.onPulse(d.at, d.level)
      } else if (rank(d.level) < rank(s.level)) {
        if (++s.calm >= CALM_TICKS) {
          s.level = d.level
          s.calm = 0
          s.updatedAt = t
          this.record(t, s, 'deescalate')
        }
      } else s.calm = 0
      if (idsOf(s.involved) !== idsOf(d.involved)) s.updatedAt = t
      s.involved = d.involved
      s.subject = d.subject
      s.place = d.place
      s.valueText = d.valueText
      s.conditionActive = true
      s.missing = 0
    }
    for (const key of this.muted.keys()) if (!seen.has(key)) this.muted.delete(key)
    for (const s of [...this.active]) {
      if (seen.has(s.key)) continue
      s.conditionActive = false
      s.calm = 0
      if (++s.missing >= RESOLVE_TICKS) this.close(t, s)
    }
  }

  private close(t: number, s: Signal) {
    s.status = 'resolved'
    s.resolvedAt = t
    s.updatedAt = t
    this.active = this.active.filter((a) => a !== s)
    this.resolved.unshift(s)
    if (this.resolved.length > MAX_RESOLVED) this.resolved.length = MAX_RESOLVED
    this.record(t, s, 'resolve')
  }

  find(id: string): Signal | undefined {
    return this.active.find((s) => s.id === id)
  }

  acknowledge(id: string, t: number) {
    const s = this.find(id)
    if (s && s.status === 'new') {
      s.status = 'acknowledged'
      s.updatedAt = t
    }
  }

  toggleStep(id: string, stepId: string, t: number) {
    const s = this.find(id) ?? this.resolved.find((r) => r.id === id)
    const step = s?.steps.find((x) => x.id === stepId)
    if (s && step && s.status !== 'resolved') {
      step.done = !step.done
      s.updatedAt = t
      // ticking any step of a new signal (fresh, or set back to new by an escalation) takes it into work
      if (step.done && s.status === 'new') s.status = 'acknowledged'
    }
  }

  canResolve(s: Signal): boolean {
    return !s.conditionActive || s.steps.every((x) => x.done)
  }

  resolve(id: string, t: number) {
    const s = this.find(id)
    if (!s || !this.canResolve(s)) return
    if (s.conditionActive) this.muted.set(s.key, s.level)
    this.close(t, s)
  }

  view(s: Signal): SignalView {
    let people = 0
    let vehicles = 0
    for (const r of s.involved) {
      if (r.kind === 'person') people++
      else vehicles++
    }
    return {
      id: s.id,
      type: s.type,
      title: SIGNAL_TITLE[s.type]({ people, vehicles }),
      level: s.level,
      status: s.status,
      subject: s.subject,
      place: s.place,
      openedAt: s.openedAt,
      updatedAt: s.updatedAt,
      resolvedAt: s.resolvedAt,
      people,
      vehicles,
      involved: s.involved,
      valueText: s.valueText,
      checklist: s.steps.map((x) => ({ ...x })),
      canResolve: this.canResolve(s),
      conditionActive: s.conditionActive,
    }
  }
}
