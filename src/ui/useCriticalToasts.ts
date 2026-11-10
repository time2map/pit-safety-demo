import { markRaw, watch, type ShallowRef } from 'vue'
import { toast } from 'vue-sonner'
import type { SignalLevel, Snapshot } from '@/engine/contract'
import type { Outlet } from '@/engine/outlet'
import SignalToast from './SignalToast.vue'

const Body = markRaw(SignalToast)

/**
 * Raises a toast when a signal first appears as critical or escalates to critical.
 * Signals present in the first snapshot (seeded history) never toast, and neither
 * do those present right after a reset (sim time going backwards). A reset also
 * clears open toasts, since the new run reuses signal ids.
 */
export function useCriticalToasts(snapshot: ShallowRef<Snapshot>, outlet: Outlet) {
  let seen: Map<string, SignalLevel> | null = null
  let lastT = -Infinity

  watch(
    snapshot,
    (s) => {
      const next = new Map<string, SignalLevel>()
      for (const sig of s.signalsActive) next.set(sig.id, sig.level)
      const reset = seen !== null && s.t < lastT
      if (reset) toast.dismiss()
      if (seen !== null && !reset) {
        for (const sig of s.signalsActive) {
          if (sig.level !== 'critical' || seen.get(sig.id) === 'critical') continue
          toast.custom(Body, {
            id: `crit-${sig.id}`,
            duration: 9000,
            componentProps: {
              title: sig.title,
              kind: sig.subject.kind,
              subject: sig.subject.label,
              place: sig.place,
              openSignal: () => outlet.openSignal(sig.id),
            },
          })
        }
      }
      seen = next
      lastT = s.t
    },
    { immediate: true },
  )
}
