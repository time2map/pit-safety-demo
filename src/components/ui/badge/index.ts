import { cva, type VariantProps } from 'class-variance-authority'

export { default as Badge } from './Badge.vue'

/** Tinted sentence-case pills. Tones map to the --lv-* status palette. */
export const badgeVariants = cva(
  'inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-medium leading-none tabular-nums ring-1 ring-inset [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        neutral: 'bg-black/5 text-neutral-700 ring-black/5',
        critical: 'bg-lv-critical-bg text-lv-critical-fg ring-lv-critical/15',
        warning: 'bg-lv-warning-bg text-lv-warning-fg ring-lv-warning/25',
        normal: 'bg-lv-normal-bg text-lv-normal-fg ring-lv-normal/15',
        offline: 'bg-lv-offline-bg text-lv-offline-fg ring-lv-offline/15',
        solid: 'bg-primary text-primary-foreground ring-transparent',
      },
      size: {
        default: '',
        lg: 'h-6 px-2.5',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'default' },
  },
)

export type BadgeVariants = VariantProps<typeof badgeVariants>
