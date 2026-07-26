import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, Clock, MessageCircle, RefreshCw, XCircle } from 'lucide-react'
import { Container } from '@/components/layout/PublicLayout'
import { Card } from '@/components/ui/Card'
import { Button, LinkButton } from '@/components/ui/Button'
import { LoadingScreen } from '@/components/ui/Feedback'
import { useOrder } from '@/features/orders/queries'
import { useStoreSettings } from '@/features/catalog/queries'
import { verifyPayment } from '@/features/checkout/api'
import { orderKeys } from '@/features/orders/queries'
import { formatPrice } from '@/lib/format'
import { supportWhatsappLink } from '@/lib/contact'

/**
 * Where the gateway drops the buyer after payment.
 *
 * The callback is asynchronous and, with an unsigned gateway, is only ever
 * a hint — so this screen actively asks our server to confirm with the
 * gateway rather than waiting and hoping. Without this, a buyer whose
 * callback was delayed sees "awaiting payment" after paying, which is the
 * fastest way to generate a refund request.
 */
export function PaymentReturnPage() {
  const [params] = useSearchParams()
  const orderId = params.get('order') ?? undefined
  const queryClient = useQueryClient()

  const { data: order, isLoading } = useOrder(orderId, { poll: true })
  const { data: settings } = useStoreSettings()

  const [checking, setChecking] = useState(true)
  const [attempts, setAttempts] = useState(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!orderId) return

    let cancelled = false

    async function check(round: number) {
      if (cancelled) return
      try {
        const result = await verifyPayment(orderId!)
        await queryClient.invalidateQueries({ queryKey: orderKeys.one(orderId!) })

        if (result.status !== 'pending_payment' || round >= 5) {
          if (!cancelled) setChecking(false)
          return
        }
      } catch {
        if (round >= 5) {
          if (!cancelled) setChecking(false)
          return
        }
      }

      if (cancelled) return
      setAttempts(round + 1)
      // Back off: the gateway may still be settling, and its own host can
      // be waking from sleep on the first call.
      timerRef.current = window.setTimeout(() => void check(round + 1), 3000 + round * 2000)
    }

    void check(0)

    return () => {
      cancelled = true
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [orderId, queryClient])

  if (!orderId) {
    return (
      <Container className="py-16">
        <Card className="mx-auto max-w-md text-center">
          <h1 className="font-display text-xl font-bold">No order to show</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            This page needs an order reference.
          </p>
          <LinkButton to="/account/orders" className="mt-5" variant="glass">
            Go to my orders
          </LinkButton>
        </Card>
      </Container>
    )
  }

  if (isLoading) return <LoadingScreen label="Loading your order" />

  const status = order?.status
  const settled = status === 'paid' || status === 'delivered'
  const failed = status === 'failed' || status === 'cancelled'

  return (
    <Container className="py-16">
      <Card elevation="raised" className="mx-auto max-w-lg text-center">
        {settled ? (
          <>
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[var(--success)]/15">
              <CheckCircle2 className="size-8 text-[var(--success)]" aria-hidden />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold">Payment received</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Thank you. Your order is confirmed and we are preparing your files now.
            </p>
          </>
        ) : failed ? (
          <>
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[var(--danger)]/15">
              <XCircle className="size-8 text-[var(--danger)]" aria-hidden />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold">Payment did not go through</h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              No money was taken. You can try again from the product page.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[var(--warning)]/15">
              {checking ? (
                <RefreshCw className="size-8 animate-spin text-[var(--warning)]" aria-hidden />
              ) : (
                <Clock className="size-8 text-[var(--warning)]" aria-hidden />
              )}
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold">
              {checking ? 'Confirming your payment' : 'Payment not confirmed yet'}
            </h1>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              {checking
                ? 'This can take a few seconds. Please do not close this page.'
                : 'If money left your account, do not pay again — send us your order number and we will sort it out straight away.'}
            </p>
            {checking && attempts > 0 && (
              <p className="mt-1 text-xs text-[var(--text-muted)]">Check {attempts + 1} of 6…</p>
            )}
          </>
        )}

        {order && (
          <dl className="mt-6 space-y-2 border-t border-[var(--glass-edge-lo)] pt-5 text-left text-sm">
            <Row label="Order number" value={<span className="tnum font-medium">{order.order_number}</span>} />
            <Row label="Product" value={order.product_title_snapshot} />
            <Row label="Amount" value={<span className="tnum">{formatPrice(order.amount_inr)}</span>} />
          </dl>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <LinkButton to={`/account/orders/${orderId}`} fullWidth>
            Track this order
          </LinkButton>
          {!settled && !checking && (
            <Button
              variant="glass"
              fullWidth
              onClick={() => {
                setChecking(true)
                setAttempts(0)
                void verifyPayment(orderId).finally(() => {
                  void queryClient.invalidateQueries({ queryKey: orderKeys.one(orderId) })
                  setChecking(false)
                })
              }}
            >
              <RefreshCw className="size-4" aria-hidden />
              Check again
            </Button>
          )}
        </div>

        {settings?.whatsapp_number && !settled && (
          <a
            href={supportWhatsappLink(settings.whatsapp_number, order?.order_number)}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <MessageCircle className="size-4" aria-hidden />
            Message us about this order
          </a>
        )}

        {settled && (
          <p className="mt-5 text-xs text-[var(--text-muted)]">
            We will send your files to <strong>{order?.buyer_email}</strong> and WhatsApp{' '}
            <strong className="tnum">{order?.buyer_whatsapp}</strong>.{' '}
            <Link to="/account/profile" className="underline">
              Wrong details?
            </Link>
          </p>
        )}
      </Card>
    </Container>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  )
}
