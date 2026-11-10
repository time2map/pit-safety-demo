/** Deterministic random numbers: mulberry32 with one independent stream per subsystem. */
export type Rng = () => number

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a, used to derive stream seeds from names */
function hash(s: string, seed: number): number {
  let h = (2166136261 ^ seed) >>> 0
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0
  return h
}

export interface Streams {
  sensors: Rng
  people: Rng
  trucks: Rng
  misc: Rng
}

export function createStreams(seed: number): Streams {
  const s = (name: string) => mulberry32(hash(name, seed))
  return { sensors: s('sensors'), people: s('people'), trucks: s('trucks'), misc: s('misc') }
}

export const range = (r: Rng, a: number, b: number) => a + (b - a) * r()

/** standard normal sample (Box-Muller) */
export function gauss(r: Rng): number {
  const u = Math.max(r(), 1e-12)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r())
}
