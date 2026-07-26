import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Copy, Mail, MessageCircle, PackageCheck, ShoppingBag } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { StatusPill } from '@/components/ui/Badge'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { useToast } from '@/components/ui/Toast'
import {
  useAdminOrders,
  useUpdateOrderStatus,
  type OrderFilter,
} from '@/features/admin/queries'
import { useStoreSettings } from '@/features/catalog/queries'
import { emailDeliveryLink, whatsappDeliveryLink } from '@/lib/contact'
import { formatDateTime, formatPrice, formatRelative } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Order } from '@/types/database'

const tabs: { key: OrderFilter; label: string }[] = [
  { key: 'paid', label: 'Ready to deliver' },
  { key: 'pending_payment', label: 'Awaiting payment' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'failed', label: 'Failed' },
  { key: 'all', label: 'All' },
]

const isOrderFilter = (v: string): v is OrderFilter => tabs.some((t) => t.key === v)

export function AdminOrders() {
  const [params, setParams] = useSearchParams()
  // Default to the queue that needs action, not to a generic list. An
  // unrecognised ?status= in the URL falls back rather than throwing.
  const raw = params.get('status') ?? 'paid'
  const status: OrderFilter = isOrderFilter(raw) ? raw : 'paid'
  const { data: orders, isLoading } = useAdminOrders(status)
  const [active, setActive] = useState<Order | null>(null)

  return (
    <>
      <h1 className="font-display text-2xl font-bold sm:text-3xl">Orders</h1>
      <p className="mt-1.5 text-sm text-[var(--text-muted)]">
        Paid orders are waiting for you to send their files.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setParams({ status: t.key })}
            aria-pressed={status === t.key}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              status === t.key
                ? 'brand-gradient text-white'
                : 'text-[var(--text-secondary)] neu-raised hover:text-[var(--text-primary)]',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
        ) : orders && orders.length > 0 ? (
          orders.map((order) => (
            <Card key={order.id} className="cursor-pointer" onClick={() => setActive(order)}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="tnum text-xs text-[var(--text-muted)]">
                      {order.order_number}
                    </span>
                    <StatusPill status={order.status} size="sm" />
                  </div>
                  <h2 className="mt-1 truncate font-medium">{order.product_title_snapshot}</h2>
                  <p className="mt-1 truncate text-sm text-[var(--text-muted)]">
                    {order.buyer_name ?? '—'} · {order.buyer_email}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                    {formatRelative(order.created_at)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="tnum font-display text-lg font-bold">
                    {formatPrice(order.amount_inr)}
                  </span>
                  {order.status === 'paid' && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActive(order)
                      }}
                    >
                      Deliver
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={ShoppingBag}
            title={status === 'paid' ? 'Nothing waiting to be delivered' : 'No orders here'}
            description={
              status === 'paid'
                ? 'Every paid order has been sent. Nice.'
                : 'Try a different filter.'
            }
          />
        )}
      </div>

      <DeliverPanel order={active} onClose={() => setActive(null)} />
    </>
  )
}

/**
 * The fulfilment screen. This is the owner's entire daily workflow, so it
 * puts the two delivery links and the "done" button in one place with the
 * message already written.
 */
function DeliverPanel({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const { data: settings } = useStoreSettings()
  const { toast } = useToast()
  const updateStatus = useUpdateOrderStatus()
  const [note, setNote] = useState('')

  if (!order) return null

  const storeName = settings?.store_name ?? 'UX Store'
  const canDeliver = order.status === 'paid'

  async function setStatus(next: Order['status'], successMessage: string) {
    try {
      await updateStatus.mutateAsync({
        orderId: order!.id,
        status: next,
        adminNote: note.trim() || undefined,
      })
      toast(successMessage, 'success')
      onClose()
      setNote('')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not update the order.', 'error')
    }
  }

  function copy(text: string, what: string) {
    void navigator.clipboard.writeText(text)
    toast(`${what} copied.`, 'success')
  }

  return (
    <Modal
      open={Boolean(order)}
      onClose={onClose}
      title={order.product_title_snapshot}
      description={`${order.order_number} · ${formatPrice(order.amount_inr)}`}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={order.status} />
          {order.paid_at && (
            <span className="text-xs text-[var(--text-muted)]">
              Paid {formatDateTime(order.paid_at)}
            </span>
          )}
        </div>

        <div className="neu-well space-y-3 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Send the files to
          </h3>

          <ContactRow
            label="WhatsApp"
            value={order.buyer_whatsapp}
            onCopy={() => copy(order.buyer_whatsapp, 'Number')}
          />
          <ContactRow
            label="Email"
            value={order.buyer_email}
            onCopy={() => copy(order.buyer_email, 'Email')}
          />
          {order.buyer_name && <ContactRow label="Name" value={order.buyer_name} />}
        </div>

        {order.buyer_note && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Customer note
            </h3>
            <p className="mt-1.5 whitespace-pre-line text-sm text-[var(--text-secondary)]">
              {order.buyer_note}
            </p>
          </div>
        )}

        {canDeliver && (
          <div className="grid gap-2 sm:grid-cols-2">
            <a
              href={whatsappDeliveryLink(order, storeName)}
              target="_blank"
              rel="noreferrer noopener"
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-medium text-black"
            >
              <MessageCircle className="size-4" aria-hidden />
              Open WhatsApp
            </a>
            <a
              href={emailDeliveryLink(order, storeName)}
              className="flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-medium neu-raised"
            >
              <Mail className="size-4" aria-hidden />
              Open email
            </a>
          </div>
        )}

        <Textarea
          label="Internal note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="How you delivered it, anything to remember…"
        />

        <div className="flex flex-wrap gap-2">
          {canDeliver && (
            <Button
              loading={updateStatus.isPending}
              onClick={() => void setStatus('delivered', 'Order marked as delivered.')}
            >
              <PackageCheck className="size-4" aria-hidden />
              Mark as delivered
            </Button>
          )}

          {order.status === 'pending_payment' && (
            <>
              {/* Manual confirmation path — needed when a payment lands
                  outside the gateway, or the callback never arrives. */}
              <Button
                variant="glass"
                loading={updateStatus.isPending}
                onClick={() => void setStatus('paid', 'Order marked as paid.')}
              >
                Mark as paid manually
              </Button>
              <Button
                variant="outline"
                loading={updateStatus.isPending}
                onClick={() => void setStatus('cancelled', 'Order cancelled.')}
              >
                Cancel order
              </Button>
            </>
          )}

          {order.status === 'delivered' && (
            <p className="text-sm text-[var(--text-muted)]">
              Delivered {formatDateTime(order.delivered_at)}.
            </p>
          )}
        </div>

        {order.admin_note && (
          <p className="border-t border-[var(--glass-edge-lo)] pt-3 text-xs text-[var(--text-muted)]">
            Previous note: {order.admin_note}
          </p>
        )}
      </div>
    </Modal>
  )
}

function ContactRow({
  label,
  value,
  onCopy,
}: {
  label: string
  value: string
  onCopy?: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="shrink-0 text-xs text-[var(--text-muted)]">{label}</span>
      <div className="flex min-w-0 items-center gap-2">
        <span className="tnum truncate text-sm font-medium">{value}</span>
        {onCopy && (
          <button
            onClick={onCopy}
            aria-label={`Copy ${label.toLowerCase()}`}
            className="shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <Copy className="size-3.5" aria-hidden />
          </button>
        )}
      </div>
    </div>
  )
}
