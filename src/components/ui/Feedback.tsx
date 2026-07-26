import { Loader2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-5 animate-spin text-[var(--text-muted)]', className)} />
}

export function LoadingScreen({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <Spinner className="size-7" />
      <p className="text-sm text-[var(--text-muted)]">{label}…</p>
    </div>
  )
}

/**
 * No shimmer sweep here — an animated gradient over a translucent panel
 * reads as visual noise, and it is one of the first things to break under
 * prefers-reduced-motion.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded-lg bg-[var(--glass-fill-lo)]', className)}
      aria-hidden
    />
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-6 py-14 text-center', className)}>
      {Icon && (
        <div className="grid size-14 place-items-center rounded-2xl neu-well">
          <Icon className="size-6 text-[var(--text-muted)]" aria-hidden />
        </div>
      )}
      <h3 className="text-base font-semibold">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-[var(--text-muted)]">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
}: {
  title?: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <h3 className="text-base font-semibold text-[var(--danger)]">{title}</h3>
      {description && <p className="max-w-md text-sm text-[var(--text-muted)]">{description}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-primary)] neu-raised"
        >
          Try again
        </button>
      )}
    </div>
  )
}
