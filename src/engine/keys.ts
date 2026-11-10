import { inject, type InjectionKey, type Ref, type ShallowRef } from 'vue'
import type { Basemap, EngineCommands, LayerGroup, MapControls, Snapshot } from './contract'
import type { AppOptions } from '@/config/options'
import type { Outlet } from './outlet'

/** Everything the UI needs, provided once by App.vue. */
export interface AppContext {
  snapshot: ShallowRef<Snapshot>
  commands: EngineCommands
  map: MapControls
  basemap: Ref<Basemap>
  /** reactive record, mutate through map.setLayer */
  layers: Record<LayerGroup, boolean>
  options: AppOptions
  /** presenter dock visibility (H key toggles) */
  dockVisible: Ref<boolean>
  /** left panel navigation: signal list, signal cards, object cards; drives the map selection */
  outlet: Outlet
}

export const APP_KEY: InjectionKey<AppContext> = Symbol('app')

export function useApp(): AppContext {
  const ctx = inject(APP_KEY)
  if (!ctx) throw new Error('App context is not provided')
  return ctx
}
