import {
  CheckCircle2,
  Clock,
  PackageCheck,
  RotateCcw,
  XCircle,
  Ban,
  type LucideIcon,
} from 'lucide-react'
import type { OrderStatus } from '@/types/database'
import { cn } from '@/lib/utils'

export function Badge({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-[var(--glass-edge-lo)]',
        'bg-[var(--glass-fill-lo)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]',
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  )
}

/**
 * Status is never conveyed by colour alone — every pill carries an icon
 * and a text label, so it still reads correctly in monochrome, in forced
 * colours, and for colour-blind users.
 */
const statusMeta: Record<
  OrderStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  pending_payment: {
    label: 'Awaiting payment',
    icon: Clock,
    className: 'text-[var(--warning)] border-current/25 bg-current/10',
  },
  paid: {
    label: 'Paid',
    icon: CheckCircle2,
    className: 'text-[var(--info)] border-current/25 bg-current/10',
  },
  delivered: {
    label: 'Delivered',
    icon: PackageCheck,
    className: 'text-[var(--success)] border-current/25 bg-current/10',
  },
  failed: {
    label: 'Payment failed',
    icon: XCircle,
    className: 'text-[var(--danger)] border-current/25 bg-current/10',
  },
  cancelled: {
    label: 'Cancelled',
    icon: Ban,
    className: 'text-[var(--text-muted)] border-current/25 bg-current/10',
  },
  refunded: {
    label: 'Refunded',
    icon: RotateCcw,
    className: 'text-[var(--text-muted)] border-current/25 bg-current/10',
  },
}

export function StatusPill({
  status,
  className,
  size = 'md',
}: {
  status: OrderStatus
  className?: string
  size?: 'sm' | 'md'
}) {
  const meta = statusMeta[status]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        meta.className,
        className,
      )}
    >
      <Icon className={size === 'sm' ? 'size-3' : 'size-3.5'} aria-hidden />
      {meta.label}
    </span>
  )
}

export const orderStatusLabel = (s: OrderStatus) => statusMeta[s].label
