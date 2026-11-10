import { cva, type VariantProps } from 'class-variance-authority'

export { default as Button } from './Button.vue'

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full text-sm font-medium outline-none select-none transition-[color,background-color,box-shadow,opacity] focus-visible:ring-2 focus-visible:ring-ring/70 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        secondary: 'border border-black/5 bg-white/75 text-foreground shadow-xs hover:bg-white',
        outline: 'border border-black/10 bg-transparent text-foreground hover:bg-black/5',
        ghost: 'text-foreground hover:bg-black/5 data-[state=open]:bg-black/5',
      },
      size: {
        default: 'h-9 px-4',
        sm: 'h-8 px-3.5 text-xs',
        xs: 'h-7 px-3 text-xs',
        icon: 'size-10',
        'icon-sm': 'size-8',
        'icon-xs': 'size-7',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export type ButtonVariants = VariantProps<typeof buttonVariants>
