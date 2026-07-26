/**
 * Payment gateway adapter layer.
 *
 * Everything the rest of the app touches goes through `PaymentGateway`.
 * `GATEWAY_PROVIDER` picks an implementation at runtime:
 *   primepay — the live integration (see below)
 *   mock     — in-app simulator, no external calls, for local testing
 *   manual   — UPI/QR, admin confirms by hand; a fallback if PrimePay is down
 */

export type NormalizedStatus = 'pending' | 'paid' | 'failed' | 'cancelled'

export interface InitiateInput {
  orderId: string
  orderNumber: string
  /** Rupees, matching orders.amount_inr. */
  amountInr: number
  customerName: string
  customerEmail: string
  customerPhone: string
  productTitle: string
  /** Where the browser lands after paying. */
  returnUrl: string
  /** Where the gateway POSTs its callback. */
  webhookUrl: string
}

export interface InitiateResult {
  /** The provider's own reference. Stored on orders.gateway_ref. */
  gatewayRef: string
  /** Where to send the browser next. */
  redirectUrl: string
  raw: unknown
}

export interface NormalizedEvent {
  eventId: string
  eventType: string
  gatewayRef: string
  /** Our order number, when the provider echoes it back. May be empty. */
  orderNumber: string
  status: NormalizedStatus
  raw: unknown
}

export type ParseResult =
  | { ok: true; event: NormalizedEvent }
  | { ok: false; reason: 'bad_signature' | 'malformed' | 'unsupported'; detail?: string }

export interface StatusResult {
  status: NormalizedStatus
  raw: unknown
}

export interface PaymentGateway {
  readonly id: string
  /**
   * True when the provider's callback carries no signature, so the callback
   * body alone can never be trusted. The webhook handler MUST confirm with
   * `fetchStatus()` before settling an order.
   */
  readonly requiresStatusConfirmation: boolean
  initiate(input: InitiateInput): Promise<InitiateResult>
  parseWebhook(rawBody: string, headers: Headers): Promise<ParseResult>
  fetchStatus(gatewayRef: string): Promise<StatusResult>
}

// ---------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function sha256Hex(message: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Constant-time compare so a signature check cannot be probed byte by byte. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

const env = (k: string, fallback?: string) => Deno.env.get(k) ?? fallback

/**
 * PrimePay is hosted on Render's free tier, which puts a service to sleep
 * after inactivity. The first call after a nap can take the better part of
 * a minute to answer, so give it real time rather than failing a customer's
 * checkout on a cold start.
 */
async function fetchWithTimeout(url: string, init: RequestInit, ms = 45_000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// ---------------------------------------------------------------------
// PrimePay — https://primeqr.onrender.com
//
// Auth:    x-api-key header
// Create:  POST /api/create-payment  { amount, callback_url, return_url }
//                                 -> { success, order_id, payment_url }
// Status:  GET  /api/payment-status/:order_id  -> { success, order_id, status }
// Webhook: POST callback_url  { event, order_id, status, amount }
// Return:  return_url?order_id=...&status=success
// Amounts: RUPEES (₹1 – ₹1,00,000), not paise.
//
// SECURITY: the callback is unsigned. Anyone who learns the callback URL
// can POST {"order_id":"...","status":"success"} and, if we trusted it,
// walk away with a paid order for free. PrimePay's own documentation says
// to re-verify server-side, and that is exactly what
// `requiresStatusConfirmation` forces the webhook handler to do.
//
// We also never read `amount` from the callback. The charge was created by
// us with a price read from our own products table, so our stored
// `orders.amount_inr` is the only amount that matters.
// ---------------------------------------------------------------------

export function primePayGateway(): PaymentGateway {
  const baseUrl = (env('PRIMEPAY_BASE_URL', 'https://primeqr.onrender.com') ?? '').replace(/\/$/, '')
  const apiKey = env('PRIMEPAY_API_KEY')

  function requireKey(): string {
    if (!apiKey) {
      throw new Error(
        'PRIMEPAY_API_KEY is not set. Add it to the Edge Function secrets, ' +
          'or set GATEWAY_PROVIDER=mock to keep using the simulator.',
      )
    }
    return apiKey
  }

  function normalize(raw: string): NormalizedStatus {
    switch (raw.toLowerCase()) {
      case 'success':
        return 'paid'
      case 'failed':
      case 'failure':
        return 'failed'
      case 'cancelled':
      case 'canceled':
      case 'expired':
        return 'cancelled'
      default:
        return 'pending'
    }
  }

  return {
    id: 'primepay',
    requiresStatusConfirmation: true,

    async initiate(input) {
      const key = requireKey()

      // PrimePay accepts whole rupees. Round rather than truncate so a
      // ₹2999.50 product never silently becomes ₹2999.
      const amount = Math.round(input.amountInr)
      if (amount < 1 || amount > 100_000) {
        throw new Error(`PrimePay only accepts ₹1–₹1,00,000; this order is ₹${amount}.`)
      }

      const res = await fetchWithTimeout(`${baseUrl}/api/create-payment`, {
        method: 'POST',
        headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          callback_url: input.webhookUrl,
          return_url: input.returnUrl,
        }),
      })

      const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>

      if (!res.ok || raw.success !== true) {
        const hint =
          res.status === 401
            ? 'PRIMEPAY_API_KEY is missing or wrong.'
            : res.status === 503
              ? 'PrimePay has no UPI ID configured — set it in the PrimePay Settings page.'
              : res.status === 400
                ? 'PrimePay rejected the amount.'
                : ''
        throw new Error(
          `PrimePay create-payment failed (${res.status}). ${hint} ${JSON.stringify(raw)}`.trim(),
        )
      }

      const gatewayRef = raw.order_id
      const redirectUrl = raw.payment_url
      if (typeof gatewayRef !== 'string' || typeof redirectUrl !== 'string') {
        throw new Error(`PrimePay response missing order_id or payment_url: ${JSON.stringify(raw)}`)
      }

      return { gatewayRef, redirectUrl, raw }
    },

    async parseWebhook(rawBody) {
      let body: Record<string, unknown>
      try {
        body = JSON.parse(rawBody)
      } catch {
        return { ok: false, reason: 'malformed', detail: 'callback body is not JSON' }
      }

      const gatewayRef = typeof body.order_id === 'string' ? body.order_id : ''
      if (!gatewayRef) {
        return { ok: false, reason: 'malformed', detail: 'callback has no order_id' }
      }

      return {
        ok: true,
        event: {
          // PrimePay sends no event id, so derive a stable one. Using the
          // ref + status means a retry of the same transition dedupes,
          // while a genuine pending -> success change still gets through.
          eventId: `${gatewayRef}:${String(body.status ?? 'unknown')}`,
          eventType: String(body.event ?? 'payment.update'),
          gatewayRef,
          orderNumber: '',
          status: normalize(String(body.status ?? '')),
          raw: body,
        },
      }
    },

    async fetchStatus(gatewayRef) {
      const key = requireKey()
      const res = await fetchWithTimeout(
        `${baseUrl}/api/payment-status/${encodeURIComponent(gatewayRef)}`,
        { headers: { 'x-api-key': key } },
      )
      const raw = (await res.json().catch(() => ({}))) as Record<string, unknown>

      if (!res.ok) {
        // 404 means PrimePay has no such order — treat as unresolved rather
        // than failed, so a transient error never cancels a real payment.
        throw new Error(`PrimePay payment-status failed (${res.status}): ${JSON.stringify(raw)}`)
      }

      return { status: normalize(String(raw.status ?? '')), raw }
    },
  }
}

// ---------------------------------------------------------------------
// mock — no external calls, for testing the whole flow offline
// ---------------------------------------------------------------------

const MOCK_SECRET = () => env('MOCK_GATEWAY_SECRET', 'ux-store-mock-secret')!

export function mockGateway(): PaymentGateway {
  return {
    id: 'mock',
    // The mock signs its own callbacks, so no second confirmation is needed.
    requiresStatusConfirmation: false,

    async initiate(input) {
      const gatewayRef = `MOCK_${crypto.randomUUID()}`
      const url = new URL(input.returnUrl)
      url.pathname = '/checkout/mock'
      url.searchParams.set('ref', gatewayRef)
      url.searchParams.set('order', input.orderNumber)
      url.searchParams.set('amount', String(input.amountInr))
      return { gatewayRef, redirectUrl: url.toString(), raw: { simulated: true } }
    },

    async parseWebhook(rawBody, headers) {
      const provided = headers.get('x-mock-signature') ?? ''
      const expected = await hmacSha256Hex(MOCK_SECRET(), rawBody)
      if (!provided || !timingSafeEqual(provided, expected)) {
        return { ok: false, reason: 'bad_signature' }
      }

      let body: Record<string, unknown>
      try {
        body = JSON.parse(rawBody)
      } catch {
        return { ok: false, reason: 'malformed' }
      }

      const s = String(body.status ?? '')
      return {
        ok: true,
        event: {
          eventId: String(body.event_id ?? (await sha256Hex(rawBody))),
          eventType: String(body.event ?? 'payment.update'),
          gatewayRef: String(body.order_id ?? ''),
          orderNumber: String(body.order_number ?? ''),
          status: s === 'success' ? 'paid' : s === 'failed' ? 'failed' : 'pending',
          raw: body,
        },
      }
    },

    async fetchStatus(gatewayRef) {
      return { status: 'pending', raw: { gatewayRef, note: 'mock has no status endpoint' } }
    },
  }
}

// ---------------------------------------------------------------------
// manual — UPI / bank transfer, admin confirms by hand
// ---------------------------------------------------------------------

export function manualGateway(): PaymentGateway {
  return {
    id: 'manual',
    requiresStatusConfirmation: false,

    async initiate(input) {
      const url = new URL(input.returnUrl)
      url.pathname = '/checkout/manual'
      url.searchParams.set('order', input.orderNumber)
      return {
        gatewayRef: `MANUAL_${input.orderNumber}`,
        redirectUrl: url.toString(),
        raw: { mode: 'manual' },
      }
    },

    async parseWebhook() {
      return { ok: false, reason: 'unsupported', detail: 'manual mode has no callback' }
    },

    async fetchStatus(gatewayRef) {
      return { status: 'pending', raw: { gatewayRef, mode: 'manual' } }
    },
  }
}

// ---------------------------------------------------------------------

const registry: Record<string, () => PaymentGateway> = {
  primepay: primePayGateway,
  mock: mockGateway,
  manual: manualGateway,
}

export function getGateway(): PaymentGateway {
  const id = env('GATEWAY_PROVIDER', 'mock')!
  const make = registry[id]
  if (!make) {
    throw new Error(
      `Unknown GATEWAY_PROVIDER "${id}". Expected one of: ${Object.keys(registry).join(', ')}.`,
    )
  }
  return make()
}

export const mockSecret = MOCK_SECRET
