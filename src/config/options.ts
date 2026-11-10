/**
 * URL options.
 *   ?mode=manual   presenter mode: no autoplay, stories are started from the dock
 *   ?t=180         start the world 180 sim seconds in (instant fast-forward)
 *   ?speed=2       initial speed (1, 2 or 4)
 *   ?lowfx=1       no backdrop blur (slow GPUs)
 *   ?dock=0        hide the presenter dock on start (website embed)
 *   ?debug=1       FPS counter and dev helpers
 *   ?seed=7        alternative random seed
 */
export interface AppOptions {
  mode: 'auto' | 'manual'
  startT: number
  speed: 1 | 2 | 4
  lowfx: boolean
  dock: boolean
  debug: boolean
  seed: number
}

export function readOptions(search: string = typeof location !== 'undefined' ? location.search : ''): AppOptions {
  const q = new URLSearchParams(search)
  const num = (k: string, d: number) => {
    const v = Number(q.get(k))
    return Number.isFinite(v) && q.has(k) ? v : d
  }
  const sp = num('speed', 1)
  return {
    mode: q.get('mode') === 'manual' ? 'manual' : 'auto',
    startT: Math.max(0, num('t', 0)),
    speed: sp === 2 || sp === 4 ? sp : 1,
    lowfx: q.get('lowfx') === '1',
    dock: q.get('dock') !== '0',
    debug: q.get('debug') === '1',
    seed: Math.floor(num('seed', 20261110)),
  }
}
