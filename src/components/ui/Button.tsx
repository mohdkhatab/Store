import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'glass' | 'ghost' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:
    'brand-gradient text-white shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/35 hover:brightness-110',
  glass: 'glass text-[var(--text-primary)] hover:brightness-110',
  ghost: 'text-[var(--text-secondary)] hover:bg-[var(--glass-fill)] hover:text-[var(--text-primary)]',
  outline:
    'border border-[var(--glass-edge-lo)] text-[var(--text-primary)] hover:bg-[var(--glass-fill)]',
  danger: 'bg-[var(--danger)] text-white hover:brightness-110',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-13 px-7 text-base gap-2.5',
}

const base =
  'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 ' +
  'disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] select-none whitespace-nowrap'

interface CommonProps {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  className?: string
}

type ButtonProps = CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, fullWidth, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})

type LinkButtonProps = CommonProps & {
  to: string
  children: React.ReactNode
} & Omit<React.ComponentProps<typeof Link>, 'to' | 'className'>

export function LinkButton({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {children}
    </Link>
  )
}
