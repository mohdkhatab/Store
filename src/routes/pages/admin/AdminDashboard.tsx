import { Link } from 'react-router-dom'
import { ArrowRight, IndianRupee, PackageCheck, ShoppingBag, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Feedback'
import { StatusPill } from '@/components/ui/Badge'
import { useAdminOrders, useAdminStats } from '@/features/admin/queries'
import { formatPrice, formatRelative } from '@/lib/format'

export function AdminDashboard() {
  const { data: stats, isLoading } = useAdminStats()
  const { data: recent } = useAdminOrders('all')

  return (
    <>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Dashboard</h1>
      <p className="mt-1.5 text-sm text-[var(--text-muted)]">
        How the store is doing, and what needs your attention.
      </p>

      {stats && stats.readyToDeliver > 0 && (
        <Link to="/admin/orders?status=paid" className="mt-6 block">
          <Card className="border border-[var(--warning)]/40 transition-transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0">
            <div className="flex items-center gap-4">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--warning)]/15">
                <PackageCheck className="size-5 text-[var(--warning)]" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold">
                  {stats.readyToDeliver} order{stats.readyToDeliver === 1 ? '' : 's'} paid and
                  waiting for delivery
                </h2>
                <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                  These customers have paid. Send their files.
                </p>
              </div>
              <ArrowRight className="size-5 shrink-0 text-[var(--text-muted)]" aria-hidden />
            </div>
          </Card>
        </Link>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <Stat
              icon={IndianRupee}
              label="Total revenue"
              value={formatPrice(stats?.revenue ?? 0)}
              hint="Paid and delivered orders"
            />
            <Stat
              icon={TrendingUp}
              label="Last 30 days"
              value={formatPrice(stats?.recentRevenue ?? 0)}
            />
            <Stat
              icon={ShoppingBag}
              label="Total orders"
              value={String(stats?.totalOrders ?? 0)}
              hint={`${stats?.awaitingPayment ?? 0} awaiting payment`}
            />
            <Stat
              icon={PackageCheck}
              label="Delivered"
              value={String(stats?.delivered ?? 0)}
              hint={`${stats?.productCount ?? 0} products listed`}
            />
          </>
        )}
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Recent orders</h2>
          <Link
            to="/admin/orders"
            className="text-sm text-[var(--color-brand-500)] hover:underline dark:text-[var(--color-brand-300)]"
          >
            View all
          </Link>
        </div>

        <div className="mt-4 space-y-2">
          {recent?.slice(0, 6).map((order) => (
            <Link
              key={order.id}
              to={`/admin/orders?status=all&focus=${order.id}`}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--glass-fill-lo)]"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{order.product_title_snapshot}</p>
                <p className="tnum mt-0.5 text-xs text-[var(--text-muted)]">
                  {order.order_number} · {formatRelative(order.created_at)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="tnum text-sm font-semibold">{formatPrice(order.amount_inr)}</span>
                <StatusPill status={order.status} size="sm" />
              </div>
            </Link>
          ))}

          {recent && recent.length === 0 && (
            <p className="py-6 text-center text-sm text-[var(--text-muted)]">No orders yet.</p>
          )}
        </div>
      </Card>
    </>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  hint?: string
}) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </p>
        <Icon className="size-4 text-[var(--text-muted)]" aria-hidden />
      </div>
      <p className="tnum mt-2 font-display text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>}
    </Card>
  )
}
