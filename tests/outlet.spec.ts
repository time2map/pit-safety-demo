import { describe, expect, it } from 'vitest'
import { createOutlet, MAX_DEPTH } from '@/engine/outlet'

/** Outlet wired to a fake map: records every selection call and its camera move. */
function setup(subjects: Record<string, string> = { 'sig-1': 'IW-02', 'sig-2': 'HT-104' }) {
  const calls: string[] = []
  const outlet = createOutlet({
    select: (id) => calls.push(`select ${id}`),
    focus: (id) => calls.push(`focus ${id}`),
    subjectOf: (id) => subjects[id] ?? null,
  })
  const views = () => outlet.stack.map((v) => `${v.kind}:${v.id}`)
  return { outlet, calls, views }
}

describe('outlet navigation', () => {
  it('starts on the signal list', () => {
    const { views } = setup()
    expect(views()).toEqual([])
  })

  it('opening a signal centres the map on its subject, back returns to the list and clears the selection', () => {
    const { outlet, calls, views } = setup()
    outlet.openSignal('sig-1')
    expect(views()).toEqual(['signal:sig-1'])
    outlet.back()
    expect(views()).toEqual([])
    expect(calls).toEqual(['focus IW-02', 'select null'])
  })

  it('an object opened from a signal card stacks on top, back returns to the signal without moving the camera', () => {
    const { outlet, calls, views } = setup()
    outlet.openSignal('sig-1')
    outlet.openObject('DZ-01')
    expect(views()).toEqual(['signal:sig-1', 'object:DZ-01'])
    outlet.back()
    expect(views()).toEqual(['signal:sig-1'])
    expect(calls).toEqual(['focus IW-02', 'focus DZ-01', 'select IW-02'])
  })

  it('map clicks replace an object card instead of stacking, and centre the map on the clicked object', () => {
    const { outlet, calls, views } = setup()
    outlet.mapPick('HT-101')
    outlet.mapPick('HT-102')
    expect(views()).toEqual(['object:HT-102'])
    outlet.back()
    expect(views()).toEqual([])
    expect(calls).toEqual(['focus HT-101', 'focus HT-102', 'select null'])
  })

  it('a map click on an object while a signal card is open stacks above the signal', () => {
    const { outlet, views } = setup()
    outlet.openSignal('sig-1')
    outlet.mapPick('HT-101')
    expect(views()).toEqual(['signal:sig-1', 'object:HT-101'])
  })

  it('a click on empty map closes an object card but leaves a signal card open', () => {
    const { outlet, views } = setup()
    outlet.openSignal('sig-1')
    outlet.mapPick(null)
    expect(views()).toEqual(['signal:sig-1'])
    outlet.mapPick('HT-101')
    outlet.mapPick(null)
    expect(views()).toEqual(['signal:sig-1'])
  })

  it('reopening a card further down steps back to it instead of stacking a copy', () => {
    const { outlet, views } = setup()
    outlet.openSignal('sig-1')
    outlet.openObject('IW-02')
    outlet.openSignal('sig-1')
    expect(views()).toEqual(['signal:sig-1'])
  })

  it('home goes straight to the list', () => {
    const { outlet, calls, views } = setup()
    outlet.openSignal('sig-1')
    outlet.openObject('DZ-01')
    outlet.home()
    expect(views()).toEqual([])
    expect(calls.at(-1)).toBe('select null')
  })

  it('keeps at most MAX_DEPTH cards, dropping the oldest', () => {
    const { outlet, views } = setup()
    outlet.openSignal('sig-1')
    outlet.openObject('A')
    outlet.openSignal('sig-2')
    outlet.openObject('B')
    outlet.openObject('C')
    expect(views()).toHaveLength(MAX_DEPTH)
    expect(views()[0]).toBe('object:A')
    expect(views().at(-1)).toBe('object:C')
  })

  it('a signal that is no longer listed selects nothing', () => {
    const { outlet, calls } = setup({})
    outlet.openSignal('gone')
    expect(calls).toEqual(['select null'])
  })

  it('back on the list and clear do not touch the selection', () => {
    const { outlet, calls, views } = setup()
    outlet.back()
    outlet.openSignal('sig-1')
    outlet.clear()
    expect(views()).toEqual([])
    expect(calls).toEqual(['focus IW-02'])
  })
})
