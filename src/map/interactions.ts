/**
 * Canvas hover tooltip, pointer cursor and click picking for zones (a ground zone or radar scan
 * area resolves to its owning instrument; the ground zone wins where they overlap), plus clicks
 * on empty map. Object pins are HTML markers with their own click and tooltip (map/markers.ts);
 * events over them are left alone here.
 */
import type * as maplibregl from 'maplibre-gl'
import type { Level } from '@/engine/contract'
import { PICK_LAYERS } from './layers'

const BOX = 6
/** distance of the tooltip from the pointer and from the map edge */
const OFFSET = 14
const EDGE = 8

/** Event data of the follow camera's per-frame moves, so they do not count as the user moving the map. */
export const FOLLOW_MOVE = { psmFollow: true } as const

export interface Hit {
  id: string
  label: string
  level: Level
}

export function pickAt(map: maplibregl.Map, pt: { x: number; y: number }): Hit | null {
  const layers = PICK_LAYERS.filter((id) => map.getLayer(id))
  if (!layers.length) return null
  const feats = map.queryRenderedFeatures(
    [
      [pt.x - BOX, pt.y - BOX],
      [pt.x + BOX, pt.y + BOX],
    ],
    { layers },
  )
  // a radar scan area contains several ground zones: the ground zone wins wherever they overlap
  const best = feats.find((f) => f.properties?.kind !== 'radar') ?? feats[0]
  if (!best) return null
  const p = best.properties as Record<string, unknown>
  const raw = p.sensorId
  if (raw === undefined || raw === null || raw === '') return null
  return { id: String(raw), label: String(p.label ?? ''), level: (p.level as Level) ?? 'normal' }
}

/** an event that happened over an HTML pin */
const overPin = (e: maplibregl.MapMouseEvent) => e.originalEvent.target instanceof Element && !!e.originalEvent.target.closest('.psm-marker')

function makeTooltip(container: HTMLElement) {
  const el = document.createElement('div')
  el.className =
    'glass-soft rounded-xl px-3.5 py-2 text-sm pointer-events-none absolute left-0 top-0 z-10 flex items-center gap-2 whitespace-nowrap text-neutral-900'
  el.style.display = 'none'
  el.setAttribute('role', 'tooltip')
  const dot = document.createElement('span')
  dot.className = 'size-2.5 shrink-0 rounded-full'
  const label = document.createElement('span')
  label.className = 'font-medium'
  el.append(dot, label)
  container.appendChild(el)

  let key = ''
  return {
    el,
    /** beside the pointer, flipped to its left near the right edge */
    show(hit: Hit, x: number, y: number) {
      const k = `${hit.id}|${hit.label}|${hit.level}`
      if (k !== key) {
        key = k
        dot.style.background = `var(--lv-${hit.level})`
        label.textContent = hit.label
      }
      el.style.display = 'flex'
      const w = el.offsetWidth
      const h = el.offsetHeight
      const cw = container.clientWidth
      const left = x + OFFSET + w > cw - EDGE ? x - OFFSET - w : x + OFFSET
      const top = Math.max(EDGE, Math.min(y + OFFSET, container.clientHeight - h - EDGE))
      el.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`
    },
    hide() {
      el.style.display = 'none'
    },
  }
}

/** Installs hover and click handling. Returns a dispose function. */
export function installInteractions(map: maplibregl.Map, onPick: (id: string | null) => void): () => void {
  const container = map.getContainer()
  const canvas = map.getCanvas()
  const tip = makeTooltip(container)
  let raf = 0
  let at: { x: number; y: number } | null = null

  const setCursor = (on: boolean) => {
    const c = on ? 'pointer' : ''
    if (canvas.style.cursor !== c) canvas.style.cursor = c
  }

  const hover = () => {
    raf = 0
    if (!at) return
    const hit = pickAt(map, at)
    setCursor(!!hit)
    if (hit) tip.show(hit, at.x, at.y)
    else tip.hide()
  }
  const repick = () => {
    if (at && !raf) raf = requestAnimationFrame(hover)
  }

  const onOut = () => {
    at = null
    tip.hide()
    setCursor(false)
  }

  const onMove = (e: maplibregl.MapMouseEvent) => {
    // a pressed button is a drag; a pin shows its own tooltip
    if (e.originalEvent.buttons || overPin(e)) {
      onOut()
      return
    }
    at = { x: e.point.x, y: e.point.y }
    repick()
  }

  const onMoveStart = (e: maplibregl.MapEventType['movestart'] & { psmFollow?: boolean }) => {
    // the follow camera moves the map every frame: re-pick under the resting pointer instead of hiding
    if (e.psmFollow) {
      repick()
      return
    }
    onOut()
  }

  const onClick = (e: maplibregl.MapMouseEvent) => {
    if (e.originalEvent.altKey) return // dev point picker
    // pins stop their own clicks; this is only a safety net
    if (overPin(e)) return
    onPick(pickAt(map, e.point)?.id ?? null)
  }

  map.on('mousemove', onMove)
  map.on('mouseout', onOut)
  map.on('movestart', onMoveStart)
  map.on('click', onClick)

  return () => {
    cancelAnimationFrame(raf)
    map.off('mousemove', onMove)
    map.off('mouseout', onOut)
    map.off('movestart', onMoveStart)
    map.off('click', onClick)
    tip.el.remove()
    setCursor(false)
  }
}
