import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Container } from '@/components/layout/PublicLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { mockSettle } from '@/features/checkout/api'
import { formatPrice } from '@/lib/format'

/**
 * Stand-in for the gateway's hosted payment page, used when
 * GATEWAY_PROVIDER=mock.
 *
 * It does not shortcut the settlement: pressing a button asks the server
 * to sign a callback payload and run it through the real webhook handler,
 * so this exercises signature checking, idempotency and the status machine
 * exactly as production will.
 */
export function MockPaymentPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const gatewayRef = params.get('ref') ?? ''
  const orderNumber = params.get('order') ?? ''
  const amount = Number(params.get('amount') ?? 0)

  const [busy, setBusy] = useState<'success' | 'failed' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function settle(outcome: 'success' | 'failed') {
    setBusy(outcome)
    setError(null)
    try {
      await mockSettle(gatewayRef, outcome, amount)
      // The simulator only knows the gateway reference, not our order id,
      // so send the buyer to their order list rather than the return screen.
      navigate('/account/orders', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The simulator failed.')
      setBusy(null)
    }
  }

  return (
    <Container className="py-16">
      <Card elevation="raised" className="mx-auto max-w-md">
        <div className="flex items-center gap-2 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-3 py-2">
          <AlertTriangle className="size-4 shrink-0 text-[var(--warning)]" aria-hidden />
          <p className="text-xs font-medium text-[var(--warning)]">
            TEST MODE — no real money moves here
          </p>
        </div>

        <h1 className="mt-5 font-display text-xl font-bold">Simulated payment page</h1>
        <p className="mt-1.5 text-sm text-[var(--text-muted)]">
          This stands in for the gateway while <code className="text-xs">GATEWAY_PROVIDER=mock</code>.
        </p>

        <dl className="mt-5 space-y-2 border-y border-[var(--glass-edge-lo)] py-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-[var(--text-muted)]">Order</dt>
            <dd className="tnum font-medium">{orderNumber || '—'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[var(--text-muted)]">Reference</dt>
            <dd className="truncate pl-4 text-xs text-[var(--text-muted)]">{gatewayRef}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>Amount</dt>
            <dd className="tnum">{formatPrice(amount)}</dd>
          </div>
        </dl>

        {error && (
          <p role="alert" className="mt-4 text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        <div className="mt-5 space-y-2.5">
          <Button
            fullWidth
            size="lg"
            loading={busy === 'success'}
            disabled={busy !== null}
            onClick={() => void settle('success')}
          >
            <CheckCircle2 className="size-4" aria-hidden />
            Simulate successful payment
          </Button>
          <Button
            variant="outline"
            fullWidth
            loading={busy === 'failed'}
            disabled={busy !== null}
            onClick={() => void settle('failed')}
          >
            <XCircle className="size-4" aria-hidden />
            Simulate failed payment
          </Button>
        </div>
      </Card>
    </Container>
  )
}
