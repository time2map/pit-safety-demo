/**
 * Local metric frame: x east, y north, metres, origin SITE.origin.
 * Small-area equirectangular projection, good to centimetres over a few km.
 */
import { SITE } from '@/config/site'
import type { LngLat } from '@/engine/contract'

export interface Vec {
  x: number
  y: number
}

const LNG0 = SITE.origin.lng
const LAT0 = SITE.origin.lat
const KX = Math.cos((LAT0 * Math.PI) / 180) * 111320
const KY = 110540
const RAD = Math.PI / 180

export const toLocal = (p: LngLat): Vec => ({ x: (p[0] - LNG0) * KX, y: (p[1] - LAT0) * KY })
export const toLngLat = (v: Vec): LngLat => [LNG0 + v.x / KX, LAT0 + v.y / KY]
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y)
export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
export const smooth = (x: number) => {
  const k = clamp(x, 0, 1)
  return k * k * (3 - 2 * k)
}

/** ray casting, polygon ring not closed */
export function pointInPolygon(p: Vec, poly: Vec[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

export function circlePolygon(c: Vec, r: number, n = 72): Vec[] {
  const out: Vec[] = []
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n
    out.push({ x: c.x + r * Math.sin(a), y: c.y + r * Math.cos(a) })
  }
  return out
}

/**
 * Ellipse with semi-axes a (along bearingDeg) and b (across), optional radial noise factor per angle.
 */
export function ellipsePolygon(c: Vec, a: number, b: number, bearingDeg: number, n = 48, noise?: (phi: number) => number): Vec[] {
  const th = bearingDeg * RAD
  const ux = Math.sin(th)
  const uy = Math.cos(th)
  const out: Vec[] = []
  for (let i = 0; i < n; i++) {
    const phi = (2 * Math.PI * i) / n
    const k = noise ? noise(phi) : 1
    const p = a * Math.cos(phi) * k
    const q = b * Math.sin(phi) * k
    out.push({ x: c.x + ux * p + uy * q, y: c.y + uy * p - ux * q })
  }
  return out
}

/** rectangle centred on c, length along bearingDeg */
export function rectPolygon(c: Vec, length: number, width: number, bearingDeg: number): Vec[] {
  const th = bearingDeg * RAD
  const ux = Math.sin(th)
  const uy = Math.cos(th)
  const l = length / 2
  const w = width / 2
  return [
    [l, w],
    [l, -w],
    [-l, -w],
    [-l, w],
  ].map(([p, q]) => ({ x: c.x + ux * p + uy * q, y: c.y + uy * p - ux * q }))
}

export function centroid(poly: Vec[]): Vec {
  let x = 0
  let y = 0
  for (const p of poly) {
    x += p.x
    y += p.y
  }
  return { x: x / poly.length, y: y / poly.length }
}

/** pushes every vertex away from the centroid by d metres (good enough for convex-ish shapes) */
export function offsetPolygon(poly: Vec[], d: number): Vec[] {
  const c = centroid(poly)
  return poly.map((p) => {
    const dx = p.x - c.x
    const dy = p.y - c.y
    const l = Math.hypot(dx, dy) || 1
    return { x: p.x + (dx / l) * d, y: p.y + (dy / l) * d }
  })
}

/** closed [lng, lat] ring for GeoJSON */
export function toRing(poly: Vec[]): LngLat[] {
  const r = poly.map(toLngLat)
  r.push(r[0])
  return r
}

export interface PathPoint extends Vec {
  seg: number
}

/** Polyline with cumulative lengths; lookups walk from a segment hint, so sequential access is O(1). */
export class Path {
  readonly pts: Vec[]
  readonly cum: number[]
  readonly length: number

  constructor(pts: Vec[]) {
    this.pts = pts
    this.cum = [0]
    for (let i = 1; i < pts.length; i++) this.cum.push(this.cum[i - 1] + distance(pts[i - 1], pts[i]))
    this.length = this.cum[this.cum.length - 1]
  }

  static of(lngLats: LngLat[]): Path {
    return new Path(lngLats.map(toLocal))
  }

  seg(s: number, hint = 0): number {
    const last = this.cum.length - 2
    let i = clamp(hint, 0, last)
    while (i < last && s > this.cum[i + 1]) i++
    while (i > 0 && s < this.cum[i]) i--
    return i
  }

  at(s: number, hint = 0, out: PathPoint = { x: 0, y: 0, seg: 0 }): PathPoint {
    const d = clamp(s, 0, this.length)
    const i = this.seg(d, hint)
    const a = this.pts[i]
    const b = this.pts[i + 1]
    const len = this.cum[i + 1] - this.cum[i]
    const f = len > 0 ? (d - this.cum[i]) / len : 0
    out.x = a.x + (b.x - a.x) * f
    out.y = a.y + (b.y - a.y) * f
    out.seg = i
    return out
  }
}
