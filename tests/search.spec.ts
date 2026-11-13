import { describe, expect, it } from 'vitest'
import type { ObjectSummary } from '@/engine/contract'
import { createSimWorld } from '@/sim/world'
import { highlight, searchObjects, tokens } from '@/ui/search'

const objects = createSimWorld({ seed: 20261110, mode: 'manual', epochMs: 0 }).snapshot(null).objects
const ids = (q: string, limit = 50) => searchObjects(objects, q, limit).hits.map((h) => h.object.id)
const first = (q: string) => ids(q)[0]

describe('object search', () => {
  it('finds nothing for an empty or blank query', () => {
    expect(ids('')).toEqual([])
    expect(ids('   ')).toEqual([])
  })

  it('finds an id however it is typed, and ranks it first', () => {
    for (const q of ['DZ-02', 'dz-02', 'dz02', 'dz 02', ' DZ-02 ']) expect(first(q), q).toBe('DZ-02')
    expect(first('ht104')).toBe('HT-104')
    // leading zeros of the number can be left out
    expect(first('IW-2')).toBe('IW-02')
    expect(first('pz3')).toBe('PZ-03')
    expect(first('dz2')).toBe('DZ-02')
  })

  it('an id prefix lists the matching objects in id order', () => {
    expect(ids('iw-0')).toEqual(['IW-01', 'IW-02', 'IW-03', 'IW-04', 'IW-05'])
    expect(ids('HT-1').slice(0, 3)).toEqual(['HT-101', 'HT-102', 'HT-103'])
  })

  it('finds kinds by their label and everyday names', () => {
    expect(ids('bulldozer').sort()).toEqual(['DZ-01', 'DZ-02'])
    expect(ids('dozer').sort()).toEqual(['DZ-01', 'DZ-02'])
    const wells = ids('borehole')
    expect(wells.every((id) => id.startsWith('IW-') || id.startsWith('PZ-'))).toBe(true)
    expect(wells).toHaveLength(9)
    expect(ids('worker')).toHaveLength(9)
    expect(ids('worker').every((id) => id.startsWith('PE-'))).toBe(true)
  })

  it('finds people by name and role, vehicles by operator, instruments by place', () => {
    const lindqvist = objects.find((o) => o.label === 'J. Lindqvist')!
    expect(first('lindqvist')).toBe(lindqvist.id)
    expect(first('surveyor')).toBe(lindqvist.id)
    expect(first('Aalto')).toBe('DZ-02')
    // the west wall: its instruments and the dozer that works there; the exact place ranks above north and south west wall
    const westWall = ids('west wall')
    expect(westWall[0]).toBe('DZ-02')
    expect(westWall.filter((id) => id !== 'DZ-02').every((id) => objects.find((o) => o.id === id)!.category === 'sensor')).toBe(true)
    const exact = objects.filter((o) => o.keywords.includes('west wall')).map((o) => o.id)
    expect(westWall.slice(0, exact.length).sort()).toEqual([...exact].sort())
  })

  it('a road or place typed out finds what is on it, and a one-letter word is not an initial', () => {
    const roadB = objects.filter((o) => o.keywords.includes('haul road B')).map((o) => o.id)
    expect(roadB.length).toBeGreaterThan(0)
    expect(ids('haul road b').sort()).toEqual([...roadB].sort())
    expect(objects.find((o) => o.id === first('haul road c'))!.keywords).toContain('haul road C')
    // "b" alone is not N. Berg or B. Sauer
    expect(ids('haul b').every((id) => roadB.includes(id))).toBe(true)
  })

  it('finds an id typed as words, without leading zeros', () => {
    expect(first('dz 2')).toBe('DZ-02')
    expect(first('piezometer 3')).toBe('PZ-03')
    expect(first('prism 4')).toBe('P-04')
    expect(first('sr 01')).toBe('SR-1')
    expect(ids('2')).toContain('DZ-02')
  })

  it('finds plurals and two-word kind names', () => {
    expect(ids('trucks').filter((id) => id.startsWith('HT-'))).toHaveLength(10)
    expect(ids('boreholes')).toHaveLength(9)
    expect(ids('workers')).toHaveLength(9)
    expect(first('pickup truck')).toBe('LV-01')
  })

  it('a short id start ranks the visible labels first, not the hidden ids of people', () => {
    // every top hit shows a P at the start of its label (P-01, PZ-01, P. Moreau); people with other names come after
    const top = ids('p').slice(0, 10)
    expect(top.every((id) => objects.find((o) => o.id === id)!.label.startsWith('P'))).toBe(true)
    expect(ids('p').indexOf('PE-03')).toBeGreaterThanOrEqual(10)
  })

  it('the detail line does not repeat the kind when the state matched', () => {
    const hit = searchObjects(objects, 'hauling', 50).hits[0]!
    expect(hit.detail).toBe(hit.object.subtitle)
  })

  it('a long paste is cut off and does not stall', () => {
    const t0 = performance.now()
    expect(() => searchObjects(objects, 'west wall '.repeat(200))).not.toThrow()
    expect(performance.now() - t0).toBeLessThan(200)
  })

  it('every word has to match: kind and place together narrow it down', () => {
    const hits = ids('piezometer north west')
    expect(hits).toEqual(['PZ-04'])
    expect(ids('dozer surveyor')).toEqual([])
  })

  it('ignores case and accents', () => {
    const fake: ObjectSummary[] = [
      { id: 'PE-90', label: 'M. Müller', kind: 'person', category: 'person', level: 'normal', lngLat: [0, 0], subtitle: 'Fitter, walking', keywords: ['Fitter'] },
    ]
    expect(searchObjects(fake, 'MULLER').hits.map((h) => h.object.id)).toEqual(['PE-90'])
    expect(searchObjects(fake, 'müll').hits.map((h) => h.object.id)).toEqual(['PE-90'])
  })

  it('says what matched when it was not the label: the operator of a vehicle', () => {
    const hit = searchObjects(objects, 'aalto').hits[0]!
    expect(hit.detail).toBe('Dozer, T. Aalto')
  })

  it('caps the list and counts the rest', () => {
    const r = searchObjects(objects, 'sensor', 5)
    expect(r.hits).toHaveLength(5)
    expect(r.more).toBe(objects.filter((o) => o.category === 'sensor').length - 5)
  })

  it('highlights the matched word starts in the label, and a compact id from the start', () => {
    expect(highlight('J. Lindqvist', 'lind')).toEqual([
      { text: 'J. ', hit: false },
      { text: 'Lind', hit: true },
      { text: 'qvist', hit: false },
    ])
    expect(highlight('HT-104', 'ht104')).toEqual([
      { text: 'HT', hit: true },
      { text: '-', hit: false },
      { text: '104', hit: true },
    ])
    expect(highlight('HT-104', 'zzz')).toEqual([{ text: 'HT-104', hit: false }])
    // leading zeros left out, or the number typed as its own word
    expect(highlight('DZ-02', 'dz2')).toEqual([
      { text: 'DZ', hit: true },
      { text: '-', hit: false },
      { text: '02', hit: true },
    ])
    expect(highlight('DZ-02', 'dz 2')).toEqual([
      { text: 'DZ', hit: true },
      { text: '-', hit: false },
      { text: '02', hit: true },
    ])
  })

  it('splits the query into words and trims punctuation around them', () => {
    expect(tokens('  West, wall. ')).toEqual(['west', 'wall'])
  })
})
