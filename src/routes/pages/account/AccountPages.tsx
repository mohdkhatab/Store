import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, MessageCircle, Package, PackageCheck, RefreshCw } from 'lucide-react'
import { Container } from '@/components/layout/PublicLayout'
import { Card } from '@/components/ui/Card'
import { Button, LinkButton } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { StatusPill, orderStatusLabel } from '@/components/ui/Badge'
import { EmptyState, ErrorState, LoadingScreen, Skeleton } from '@/components/ui/Feedback'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth/AuthProvider'
import { useMyOrders, useOrder, useOrderEvents, orderKeys } from '@/features/orders/queries'
import { useStoreSettings } from '@/features/catalog/queries'
import { verifyPayment } from '@/features/checkout/api'
import { formatDateTime, formatPrice, formatRelative } from '@/lib/format'
import { supportWhatsappLink } from '@/lib/contact'
import { supabase } from '@/lib/supabase'
import { isValidWhatsApp, normalizeWhatsApp } from '@/lib/utils'

export function MyOrdersPage() {
  const { data: orders, isLoading, isError, refetch } = useMyOrders()

  return (
    <Container className="py-10">
      <h1 className="font-display text-3xl font-bold">My orders</h1>
      <p className="mt-1.5 text-sm text-[var(--text-muted)]">
        Everything you have bought, and where each order has got to.
      </p>

      <div className="mt-8 space-y-3">
        {isError ? (
          <ErrorState description="Could not load your orders." onRetry={() => void refetch()} />
        ) : isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)
        ) : orders && orders.length > 0 ? (
          orders.map((order) => (
            <Link key={order.id} to={`/account/orders/${order.id}`} className="block">
              <Card className="transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="tnum text-xs text-[var(--text-muted)]">{order.order_number}</p>
                    <h2 className="mt-0.5 truncate font-medium">{order.product_title_snapshot}</h2>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Placed {formatRelative(order.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusPill status={order.status} />
                    <span className="tnum font-display text-lg font-bold">
                      {formatPrice(order.amount_inr)}
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))
        ) : (
          <EmptyState
            icon={Package}
            title="No orders yet"
            description="Once you buy something it will show up here with live delivery status."
            action={
              <LinkButton to="/products" size="sm">
                Browse products
              </LinkButton>
            }
          />
        )}
      </div>
    </Container>
  )
}

// ---------------------------------------------------------------------

export function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const { data: order, isLoading } = useOrder(orderId)
  const { data: events } = useOrderEvents(orderId)
  const { data: settings } = useStoreSettings()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [checking, setChecking] = useState(false)

  /**
   * Ask the server to confirm the payment with the gateway directly.
   *
   * Gateway callbacks are not guaranteed — they can be delayed, dropped,
   * or never sent at all. Without this, a buyer who paid and closed the
   * tab has no way to move their order forward, and the owner gets a
   * "I paid but it still says pending" message instead.
   */
  async function checkPayment() {
    if (!orderId) return
    setChecking(true)
    try {
      const result = await verifyPayment(orderId)
      await queryClient.invalidateQueries({ queryKey: orderKeys.one(orderId) })
      await queryClient.invalidateQueries({ queryKey: orderKeys.events(orderId) })
      await queryClient.invalidateQueries({ queryKey: orderKeys.mine() })

      if (result.status === 'paid' || result.status === 'delivered') {
        toast('Payment confirmed. Your order is being prepared.', 'success')
      } else if (result.unconfirmed) {
        toast('The gateway did not respond. Please try again in a minute.', 'error')
      } else {
        toast('The gateway still shows this payment as not completed.', 'info')
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not check the payment.', 'error')
    } finally {
      setChecking(false)
    }
  }

  if (isLoading) return <LoadingScreen />

  if (!order) {
    return (
      <Container className="py-10">
        <EmptyState
          title="Order not found"
          description="This order does not exist, or it belongs to another account."
          action={
            <LinkButton to="/account/orders" variant="glass" size="sm">
              Back to my orders
            </LinkButton>
          }
        />
      </Container>
    )
  }

  const delivered = order.status === 'delivered'
  const paid = order.status === 'paid'

  return (
    <Container className="py-8">
      <Link
        to="/account/orders"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="size-4" aria-hidden />
        My orders
      </Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            {order.product_title_snapshot}
          </h1>
          <p className="tnum mt-1 text-sm text-[var(--text-muted)]">{order.order_number}</p>
        </div>
        <StatusPill status={order.status} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <div className="space-y-6">
          {(order.status === 'pending_payment' || order.status === 'failed') && (
            <Card className="border border-[var(--warning)]/25">
              <h2 className="text-sm font-semibold">Already paid for this order?</h2>
              <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                If the money has left your account but this still says awaiting payment, the
                gateway&apos;s confirmation may not have reached us yet. Check directly — we will
                ask the gateway about this order right now.
              </p>
              <Button className="mt-4" loading={checking} onClick={() => void checkPayment()}>
                <RefreshCw className="size-4" aria-hidden />
                Check payment status
              </Button>
              <p className="mt-3 text-xs text-[var(--text-muted)]">
                Do not pay again. If it still shows as unpaid after checking, message us with your
                order number and we will sort it out.
              </p>
            </Card>
          )}

          {(paid || delivered) && (
            <Card
              className={
                delivered
                  ? 'border border-[var(--success)]/25'
                  : 'border border-[var(--info)]/25'
              }
            >
              <div className="flex items-start gap-3">
                <PackageCheck
                  className={`mt-0.5 size-5 shrink-0 ${delivered ? 'text-[var(--success)]' : 'text-[var(--info)]'}`}
                  aria-hidden
                />
                <div>
                  <h2 className="text-sm font-semibold">
                    {delivered ? 'Files sent' : 'Payment confirmed — preparing your files'}
                  </h2>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {delivered
                      ? `Sent on ${formatDateTime(order.delivered_at)}. Check your WhatsApp and email, including the spam folder.`
                      : 'We are packaging your files now and will send them to the contact details below.'}
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Timeline
            </h2>
            <ol className="mt-4 space-y-4">
              {events?.length ? (
                events.map((e, i) => (
                  <li key={e.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="brand-gradient mt-1 size-2.5 shrink-0 rounded-full" />
                      {i < events.length - 1 && (
                        <span className="mt-1 w-px flex-1 bg-[var(--glass-edge-lo)]" />
                      )}
                    </div>
                    <div className="pb-1">
                      <p className="text-sm font-medium">{orderStatusLabel(e.to_status)}</p>
                      <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                        {formatDateTime(e.created_at)}
                      </p>
                      {e.note && (
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">{e.note}</p>
                      )}
                    </div>
                  </li>
                ))
              ) : (
                <li className="text-sm text-[var(--text-muted)]">No events yet.</li>
              )}
            </ol>
          </Card>

          {order.buyer_note && (
            <Card>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Your note
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm text-[var(--text-secondary)]">
                {order.buyer_note}
              </p>
            </Card>
          )}
        </div>

        <div className="space-y-4 lg:sticky lg:top-24">
          <Card elevation="raised">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Order details
            </h2>
            <dl className="mt-4 space-y-2.5 text-sm">
              <Row label="Amount" value={<span className="tnum font-semibold">{formatPrice(order.amount_inr)}</span>} />
              <Row label="Placed" value={formatDateTime(order.created_at)} />
              {order.paid_at && <Row label="Paid" value={formatDateTime(order.paid_at)} />}
              {order.delivered_at && (
                <Row label="Delivered" value={formatDateTime(order.delivered_at)} />
              )}
            </dl>

            <h3 className="mt-5 border-t border-[var(--glass-edge-lo)] pt-4 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Delivery to
            </h3>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label="Email" value={<span className="break-all">{order.buyer_email}</span>} />
              <Row label="WhatsApp" value={<span className="tnum">{order.buyer_whatsapp}</span>} />
            </dl>
          </Card>

          {settings?.whatsapp_number && (
            <Card>
              <p className="text-sm text-[var(--text-secondary)]">
                Something wrong with this order?
              </p>
              <a
                href={supportWhatsappLink(settings.whatsapp_number, order.order_number)}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium neu-raised"
              >
                <MessageCircle className="size-4" aria-hidden />
                Message us on WhatsApp
              </a>
            </Card>
          )}
        </div>
      </div>
    </Container>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-[var(--text-muted)]">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  )
}

// ---------------------------------------------------------------------

export function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth()
  const { toast } = useToast()

  const [fullName, setFullName] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '')
      setWhatsapp(profile.whatsapp ?? '')
    }
  }, [profile])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const normalized = whatsapp ? normalizeWhatsApp(whatsapp) : ''
    if (normalized && !isValidWhatsApp(normalized)) {
      setError('Enter a valid WhatsApp number with country code, e.g. 919876543210.')
      return
    }

    setBusy(true)
    // Only these three columns are writable by a normal session — the
    // `role` column has no UPDATE grant at all, so an attempt to change it
    // fails in Postgres rather than relying on this form to omit it.
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() || null, whatsapp: normalized || null })
      .eq('id', profile!.id)

    setBusy(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    await refreshProfile()
    toast('Profile updated.', 'success')
  }

  if (!profile) return <LoadingScreen />

  return (
    <Container className="py-10">
      <h1 className="font-display text-3xl font-bold">Profile</h1>
      <p className="mt-1.5 text-sm text-[var(--text-muted)]">
        These details are used to prefill checkout.
      </p>

      <Card className="mt-8 max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <Input label="Email" value={user?.email ?? ''} disabled hint="Your email cannot be changed here." />
          <Input
            label="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />
          <Input
            label="WhatsApp number"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            autoComplete="tel"
            placeholder="919876543210"
            hint="With country code, no + sign."
          />

          {error && (
            <p role="alert" className="text-sm text-[var(--danger)]">
              {error}
            </p>
          )}

          <Button type="submit" loading={busy}>
            Save changes
          </Button>
        </form>
      </Card>
    </Container>
  )
}
