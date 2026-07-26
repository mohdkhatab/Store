import { functionUrl, supabase } from '@/lib/supabase'
import type { OrderStatus } from '@/types/database'

async function callPayments<T>(action: string, body: Record<string, unknown>): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token
  if (!token) throw new Error('You need to be signed in.')

  const res = await fetch(`${functionUrl('payments')}/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(payload?.error ?? 'Something went wrong. Please try again.')
  }
  return payload as T
}

export interface CreateOrderInput {
  productId: string
  buyerName: string
  buyerEmail: string
  buyerWhatsapp: string
  buyerNote?: string
}

export interface CreateOrderResult {
  orderId: string
  orderNumber: string
  amountInr: number
  redirectUrl: string
  provider: string
}

export function createOrder(input: CreateOrderInput) {
  return callPayments<CreateOrderResult>('create', input as unknown as Record<string, unknown>)
}

/**
 * Ask the server to confirm the payment with the gateway directly. The
 * return screen calls this because the gateway's callback can be late,
 * blocked, or never sent — leaving a paying customer stuck on
 * "awaiting payment" is the worst outcome here.
 */
export function verifyPayment(orderId: string) {
  return callPayments<{ status: OrderStatus; orderNumber: string; unconfirmed?: boolean }>(
    'verify',
    { orderId },
  )
}

/** Simulator only — available when GATEWAY_PROVIDER=mock. */
export function mockSettle(gatewayRef: string, outcome: 'success' | 'failed', amount: number) {
  return callPayments<{ ok: boolean; orderStatus: string }>('mock-settle', {
    gatewayRef,
    outcome,
    amount,
  })
}
