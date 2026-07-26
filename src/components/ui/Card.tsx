import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** `flat` skips backdrop-filter — use it inside scrolling grids. */
  elevation?: 'flat' | 'panel' | 'raised'
  padded?: boolean
}

const elevations = {
  flat: 'glass-flat',
  panel: 'glass',
  raised: 'glass glass-hi',
} as const

export function Card({
  elevation = 'panel',
  padded = true,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div className={cn(elevations[elevation], padded && 'p-5 sm:p-6', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-4', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardTitle({ className, children, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-semibold', className)} {...rest}>
      {children}
    </h3>
  )
}

export function CardDescription({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-[var(--text-muted)]', className)} {...rest}>
      {children}
    </p>
  )
}
