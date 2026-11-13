/**
 * Object search: finds vehicles, people and instruments by label or id ("DZ-02", "dz02", "dz 02", "dz2",
 * "dz 2"), by kind and its everyday names ("bulldozer", "borehole", "worker"), and by the keywords of the
 * object (operator, role, work area, place, haul road) or its current state. Words match from their start;
 * three letters or more also match inside a word, at a low score; a plural falls back to its singular.
 * Every word of the query has to match somewhere and the best field of each word adds to the score; a run
 * of words that matches one keyword ("west wall", "haul road b") ranks that object higher, and the label or
 * id typed out ranks first. Pure functions, so they can be tested without the UI.
 */
import type { ObjectCategory, ObjectSummary } from '@/engine/contract'
import { KIND_LABEL, KIND_TERMS } from '@/config/copy'

export interface SearchHit {
  object: ObjectSummary
  score: number
  /** the label cut into plain and matched parts, for highlighting */
  label: { text: string; hit: boolean }[]
  /** the second line: the subtitle, or the kind and the keyword that matched when the subtitle does not show it */
  detail: string
}

export interface SearchResult {
  hits: SearchHit[]
  /** matches beyond the limit */
  more: number
}

/** a pasted paragraph is not a search: longer input and more words are cut off */
const MAX_QUERY = 64
const MAX_WORDS = 8

/** lower case, accents dropped, so "Müller" is found by "muller" */
export const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
/** letters and digits only, so "HT-104", "ht104" and "HT 104" compare equal */
const compact = (s: string) => fold(s).replace(/[^a-z0-9]/g, '')
/** compact with the leading zeros of numbers dropped, so "IW-2" and "pz3" find IW-02 and PZ-03 */
const loose = (s: string) => compact(s).replace(/(^|[a-z])0+(?=\d)/g, '$1')
const words = (s: string) => fold(s).split(/[^a-z0-9]+/).filter(Boolean)

/** query words, punctuation around them trimmed; inner punctuation stays, so "dz-02" is one word */
export function tokens(query: string): string[] {
  return fold(query.slice(0, MAX_QUERY))
    .split(/[\s,;]+/)
    .map((t) => t.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''))
    .filter(Boolean)
    .slice(0, MAX_WORDS)
}

const W = {
  labelExact: 120,
  labelStart: 90,
  labelWord: 70,
  kind: 45,
  keyword: 35,
  phrase: 40,
  phraseExact: 20,
  state: 12,
  inside: 6,
}

/**
 * Weight of the best way word `t` matches `field`. Any field: a word start, also with leading zeros left out
 * ("2" finds "02"); three letters and up: anywhere inside a word, at a low weight. Ids also match their
 * compact or loose start across punctuation ("ht104", "iw2"); free text only when that compact start ends
 * on a word boundary ("westwall", "taalto"), so a plural does not run into the next word.
 */
function matchField(t: string, field: string, weight: number, id: boolean, inside = true): number {
  const tc = t.replace(/[^a-z0-9]/g, '')
  if (!tc) return 0
  const ws = words(field)
  if (ws.some((w) => w.startsWith(tc) || loose(w).startsWith(loose(tc)))) return weight
  const c = compact(field)
  if (id) {
    if (c.startsWith(tc) || loose(field).startsWith(loose(tc))) return weight
  } else if (c.startsWith(tc)) {
    let end = 0
    if (ws.some((w) => (end += w.length) === tc.length)) return weight
  }
  if (inside && tc.length >= 3 && ws.some((w) => w.includes(tc))) return W.inside
  return 0
}

/** a one-letter word in free text counts only as a whole word next to another matched word of the same field ("haul road b") */
function matchText(t: string, field: string, weight: number, others: string[], inside = true): number {
  if (t.length > 1) return matchField(t, field, weight, false, inside)
  return words(field).includes(t) && others.some((o) => o !== t && matchField(o, field, weight, false, false) > 0) ? weight : 0
}

/** the query words appear in a row in this field, the last one as a word start */
function phraseIn(ts: string[], field: string): boolean {
  if (ts.length < 2) return false
  const ws = words(field)
  for (let i = 0; i + ts.length <= ws.length; i++) {
    if (ts.every((t, k) => (k === ts.length - 1 ? ws[i + k]!.startsWith(t) : ws[i + k] === t))) return true
  }
  return false
}

const CATEGORY_ORDER: Record<ObjectCategory, number> = { vehicle: 0, person: 1, sensor: 2 }

/** split the label into matched and plain parts: the typed id from the start, or the word starts the query words match */
export function highlight(label: string, query: string): { text: string; hit: boolean }[] {
  const chars = [...label]
  const folded = chars.map((c) => fold(c).charAt(0) || c)
  const isAlnum = (c: string) => /[a-z0-9]/.test(c)
  const alnum = folded.flatMap((c, i) => (isAlnum(c) ? [i] : []))
  const cl = alnum.map((i) => folded[i]).join('')
  const marks = new Array<boolean>(chars.length).fill(false)
  const whole = compact(query.slice(0, MAX_QUERY))
  const lw = loose(query.slice(0, MAX_QUERY))

  if (whole && cl.startsWith(whole)) {
    for (let k = 0; k < whole.length; k++) marks[alnum[k]!] = true
  } else if (lw && loose(label).startsWith(lw)) {
    // walk the label's letters and digits, counting only those loose() keeps, until the loose query is used up
    let kept = 0
    let dropping = false
    for (let k = 0; k < cl.length && kept < lw.length; k++) {
      const ch = cl[k]!
      const zeroLead: boolean = ch === '0' && (k === 0 || /[a-z]/.test(cl[k - 1]!) || dropping) && /\d/.test(cl[k + 1] ?? '')
      dropping = zeroLead
      marks[alnum[k]!] = true
      if (!zeroLead) kept++
    }
  } else {
    const ts = tokens(query).map((t) => t.replace(/[^a-z0-9]/g, '')).filter(Boolean)
    for (let i = 0; i < folded.length; ) {
      if (!isAlnum(folded[i]!)) {
        i++
        continue
      }
      let j = i
      while (j < folded.length && isAlnum(folded[j]!)) j++
      const word = folded.slice(i, j).join('')
      for (const t of ts) {
        if (word.startsWith(t)) for (let k = i; k < i + t.length; k++) marks[k] = true
        else if (loose(word).startsWith(loose(t))) for (let k = i; k < j; k++) marks[k] = true
      }
      i = j
    }
  }
  const out: { text: string; hit: boolean }[] = []
  chars.forEach((c, i) => {
    const last = out[out.length - 1]
    if (last && last.hit === marks[i]) last.text += c
    else out.push({ text: c, hit: marks[i]! })
  })
  return out
}

/** best score of one query word on an object, and the keyword it came from when a keyword won */
function scoreWord(t: string, ts: string[], o: ObjectSummary, kindTerms: string[]): { score: number; via: string | null } {
  const label = Math.max(matchField(t, o.label, W.labelWord, true), matchField(t, o.id, W.labelWord, true, false))
  const kind = t.length > 1 ? Math.max(...kindTerms.map((k) => matchField(t, k, W.kind, false, false))) : 0
  let keyword = 0
  let via: string | null = null
  for (const k of o.keywords) {
    const m = matchText(t, k, W.keyword, ts)
    if (m > keyword) {
      keyword = m
      via = k
    }
  }
  const state = matchText(t, o.subtitle, W.state, ts)
  const score = Math.max(label, kind, keyword, state)
  return { score, via: score > 0 && keyword === score && keyword > Math.max(label, kind) ? via : null }
}

/** Find objects for a query; best first, at most `limit`. An empty query finds nothing. */
export function searchObjects(objects: readonly ObjectSummary[], query: string, limit = 8): SearchResult {
  query = query.slice(0, MAX_QUERY)
  const ts = tokens(query)
  if (!ts.length) return { hits: [], more: 0 }
  const whole = compact(query)
  const lw = loose(query)
  const found: SearchHit[] = []

  for (const o of objects) {
    const kindTerms = [KIND_LABEL[o.kind], ...KIND_TERMS[o.kind]]
    let score = 0
    let via: string | null = null
    let ok = true
    for (const t of ts) {
      let w = scoreWord(t, ts, o, kindTerms)
      // a plural falls back to its singular: "trucks", "boreholes", "workers"
      if (!w.score && /^[a-z]{4,}s$/.test(t)) w = scoreWord(t.slice(0, -1), ts, o, kindTerms)
      if (!w.score) {
        ok = false
        break
      }
      score += w.score
      via ??= w.via
    }
    if (!ok) continue
    // a run of the query words inside one keyword, best when it is the whole keyword
    const phrase = o.keywords.find((k) => phraseIn(ts, k))
    if (phrase) score += W.phrase + (compact(phrase) === whole ? W.phraseExact : 0)
    // the label or id typed out ranks first, then a label (not a hidden id) that starts with the query
    if (whole && [o.label, o.id].some((s) => compact(s) === whole || loose(s) === lw)) score += W.labelExact
    else if (whole && (compact(o.label).startsWith(whole) || loose(o.label).startsWith(lw))) score += W.labelStart
    // the subtitle already says the kind (or role) and the state; name the keyword only when the subtitle does not show it
    const detail = via && !fold(o.subtitle).includes(fold(via)) ? `${KIND_LABEL[o.kind]}, ${via}` : o.subtitle
    found.push({ object: o, score, label: highlight(o.label, query), detail })
  }

  found.sort(
    (a, b) =>
      b.score - a.score ||
      CATEGORY_ORDER[a.object.category] - CATEGORY_ORDER[b.object.category] ||
      a.object.label.localeCompare(b.object.label, 'en', { numeric: true }),
  )
  return { hits: found.slice(0, limit), more: Math.max(0, found.length - limit) }
}
