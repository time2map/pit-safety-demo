/**
 * Object pins as HTML markers: one maplibregl.Marker per vehicle, person and instrument.
 * Each marker is a wrapper holding the pin button (glyph), the corner badge and the hover tooltip;
 * the look lives in styles/app.css under `.psm-marker`, driven by data attributes:
 *   data-id         object id
 *   data-cat        vehicle | person | sensor (shape and colours)
 *   data-level      normal | warning | critical | offline (glyph contrast on instruments)
 *   data-small      the object's layer is off and it is in no signal: a small pin
 *   data-signal     the object is in an active signal (stays full size, drawn above the rest)
 *   data-alert      one of its signals is not acknowledged yet (corner badge)
 *   data-selected   selection ring
 *   data-tip-below  tooltip below the pin when the top bar leaves no room above
 * Zones, blast rings and ripples stay WebGL layers under the markers.
 */
import { Marker, type Map as MapLibreMap } from 'maplibre-gl'
import { Bell, createElement } from 'lucide'
import { KIND_LABEL } from '@/config/copy'
import { LEVEL_LABEL } from '@/config/levels'
import type { ActorProps, LayerGroup, Level, LngLat, ObjectKind, SensorProps } from '@/engine/contract'
import { GLYPH, categoryOf } from './icons'

type PinProps = ActorProps | SensorProps
type PinGroup = Exclude<LayerGroup, 'zones'>

const GROUP_OF = { vehicle: 'vehicles', person: 'people', sensor: 'sensors' } as const satisfies Record<string, PinGroup>
/** a press that travels further than this is a map drag, not a click on the pin; a finger drifts more */
const CLICK_SLOP = { mouse: 4, touch: 16 }
/** keep the tooltip this far inside the map edges */
const EDGE = 8
const GAP = 6

interface Pin {
  marker: Marker
  el: HTMLElement
  btn: HTMLButtonElement
  tipDot: HTMLElement
  tipLabel: HTMLElement
  tipKind: HTMLElement
  group: PinGroup
  at: LngLat
  /** a pointer is down on the pin: it keeps its place until release, so a poll cannot pull it from under the press */
  held: boolean
  pendingAt: LngLat | null
  /** props last written to the DOM, to skip untouched pins on an update */
  key: string
  props: PinProps
}

/** room the floating panels take at the top and on the left of the map (px), so tooltips stay clear of them */
export interface Insets {
  top: number
  left: number
}

export interface Pins {
  /** sync markers with the latest actor or sensor features */
  update(features: { properties: PinProps; geometry: { coordinates: number[] } }[]): void
  setGroups(groups: Record<LayerGroup, boolean>): void
  setInsets(insets: Insets): void
  select(id: string | null): void
  destroy(): void
}

const setFlag = (el: HTMLElement, name: string, on: boolean) => {
  if (on) el.setAttribute(name, '')
  else el.removeAttribute(name)
}

function glyph(kind: ObjectKind): SVGElement {
  return createElement(GLYPH[kind], { 'aria-hidden': 'true', focusable: 'false' })
}

export function createPins(map: MapLibreMap, onPick: (id: string) => void): Pins {
  const pins = new Map<string, Pin>()
  const container = map.getContainer()
  let groups: Record<PinGroup, boolean> = { vehicles: true, people: true, sensors: true }
  let selected: string | null = null
  let insets: Insets = { top: 0, left: 0 }

  /**
   * Tooltip above the pin, or below it when the top bar leaves no room; nudged sideways to stay
   * clear of the map edges and of the left panel, which runs the full height, but always over its own pin.
   */
  const placeTip = (pin: Pin) => {
    const tip = pin.el.querySelector<HTMLElement>('.psm-tip')
    if (!tip) return
    const box = container.getBoundingClientRect()
    const r = pin.el.getBoundingClientRect()
    const w = tip.offsetWidth
    const h = tip.offsetHeight
    const below = r.top - GAP - h < box.top + Math.max(EDGE, insets.top)
    setFlag(pin.el, 'data-tip-below', below)
    const leftLimit = box.left + EDGE + insets.left
    const cx = r.left + r.width / 2
    let shift = Math.max(leftLimit - (cx - w / 2), Math.min(0, box.right - EDGE - (cx + w / 2)))
    const most = Math.max(0, w / 2 - 12)
    shift = Math.max(-most, Math.min(most, shift))
    tip.style.setProperty('--tip-shift', `${Math.round(shift)}px`)
  }

  const render = (pin: Pin) => {
    const p = pin.props
    const key = `${p.level}|${p.signal ?? ''}|${p.alert ?? ''}|${p.label}|${groups[pin.group] ? 1 : 0}`
    if (key === pin.key) return
    pin.key = key
    const el = pin.el
    el.dataset.level = p.level
    el.style.setProperty('--pin-c', `var(--lv-${p.level})`)
    setFlag(el, 'data-signal', !!p.signal)
    setFlag(el, 'data-small', !groups[pin.group] && !p.signal)
    if (p.alert) {
      el.dataset.alert = p.alert
      el.style.setProperty('--badge-c', `var(--lv-${p.alert})`)
    } else delete el.dataset.alert
    const kind = KIND_LABEL[p.kind]
    pin.btn.setAttribute('aria-label', `${p.label}, ${kind}, ${LEVEL_LABEL[p.level as Level]}`)
    pin.tipDot.style.background = `var(--lv-${p.level})`
    pin.tipLabel.textContent = p.label
    pin.tipKind.textContent = kind
  }

  const create = (p: PinProps, at: LngLat): Pin => {
    const cat = categoryOf(p.kind)
    const el = document.createElement('div')
    el.className = 'psm-marker'
    el.dataset.cat = cat
    el.dataset.id = p.id

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'psm-pin'
    // the signal list and cards give keyboard access; 46 map pins in the tab order would bury the panels
    btn.tabIndex = -1
    btn.append(glyph(p.kind))

    const badge = document.createElement('span')
    badge.className = 'psm-badge'
    badge.setAttribute('aria-hidden', 'true')
    badge.append(createElement(Bell, { 'aria-hidden': 'true' }))

    const tip = document.createElement('span')
    tip.className = 'psm-tip glass-soft'
    tip.setAttribute('aria-hidden', 'true')
    const tipDot = document.createElement('i')
    const tipLabel = document.createElement('b')
    const tipKind = document.createElement('span')
    tip.append(tipDot, tipLabel, tipKind)

    el.append(btn, badge, tip)

    const pin: Pin = {
      marker: new Marker({ element: el, anchor: 'center' }).setLngLat(at).addTo(map),
      el,
      btn,
      tipDot,
      tipLabel,
      tipKind,
      group: GROUP_OF[cat],
      at,
      held: false,
      pendingAt: null,
      key: '',
      props: p,
    }

    // a press that turns into a map drag must not open the card when it is let go over the pin
    let down: { x: number; y: number; slop: number } | null = null
    const release = () => {
      window.removeEventListener('pointerup', release, true)
      window.removeEventListener('pointercancel', release, true)
      pin.held = false
      if (pin.pendingAt) {
        pin.marker.setLngLat(pin.pendingAt)
        pin.pendingAt = null
      }
    }
    el.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY, slop: e.pointerType === 'mouse' ? CLICK_SLOP.mouse : CLICK_SLOP.touch }
      pin.held = true
      window.addEventListener('pointerup', release, true)
      window.addEventListener('pointercancel', release, true)
    })
    el.addEventListener('click', (e) => {
      // the map would otherwise read this as a click on empty map and close the card
      e.stopPropagation()
      const moved = down ? Math.hypot(e.clientX - down.x, e.clientY - down.y) : 0
      const slop = down?.slop ?? CLICK_SLOP.mouse
      down = null
      if (moved <= slop) onPick(pin.props.id)
    })
    el.addEventListener('mouseenter', () => requestAnimationFrame(() => placeTip(pin)))
    return pin
  }

  return {
    update(features) {
      for (const f of features) {
        const p = f.properties
        const at = f.geometry.coordinates as LngLat
        let pin = pins.get(p.id)
        if (!pin) {
          pin = create(p, at)
          pins.set(p.id, pin)
          if (p.id === selected) setFlag(pin.el, 'data-selected', true)
        } else {
          pin.props = p
          if (pin.at[0] !== at[0] || pin.at[1] !== at[1]) {
            pin.at = at
            if (pin.held) pin.pendingAt = at
            else {
              pin.marker.setLngLat(at)
              // a pin that jumps on a poll carries its open tooltip along; keep it clear of the edges
              if (pin.el.matches(':hover')) placeTip(pin)
            }
          }
        }
        render(pin)
      }
    },

    setGroups(g) {
      groups = { vehicles: g.vehicles, people: g.people, sensors: g.sensors }
      for (const pin of pins.values()) render(pin)
    },

    setInsets(i) {
      insets = { ...i }
    },

    select(id) {
      if (selected) {
        const old = pins.get(selected)
        if (old) setFlag(old.el, 'data-selected', false)
      }
      selected = id
      const pin = id ? pins.get(id) : undefined
      if (pin) setFlag(pin.el, 'data-selected', true)
    },

    destroy() {
      for (const pin of pins.values()) pin.marker.remove()
      pins.clear()
    },
  }
}
