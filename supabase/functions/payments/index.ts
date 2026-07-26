/**
 * Payments Edge Function.
 *
 * Everything money-related lives here, behind the service role, because a
 * browser SPA cannot be trusted with any of it. Routes:
 *
 *   POST /payments/create       (auth) start a purchase, returns a redirect URL
 *   POST /payments/webhook      (public) gateway callback
 *   POST /payments/verify       (auth) ask the gateway directly; used by the
 *                               return-from-payment screen and as the safety
 *                               net for when a callback never arrives
 *   POST /payments/mock-settle  (auth, mock mode only) drive the simulator
 *
 * verify_jwt is disabled at the platform level because the gateway callback
 * cannot present a Supabase JWT. The authenticated routes therefore check
 * the bearer token themselves — see `requireUser`.
 */

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'
import { getGateway, hmacSha256Hex, mockSecret, type NormalizedStatus } from './gateway.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

/**
 * Origins we are willing to send a paying customer back to.
 *
 * The return URL has to be an absolute URL, and hard-coding it to a
 * SITE_URL secret means one forgotten secret sends every buyer to
 * localhost. Deriving it from the request's Origin fixes that for
 * production, preview deploys and local dev at once.
 *
 * But Origin is attacker-controllable, and this value is handed to the
 * payment gateway as a redirect target — so it is matched against an
 * allow-list first. An unrecognised origin falls back to SITE_URL rather
 * than being trusted, which keeps this from becoming an open redirect.
 */
const ALLOWED_ORIGINS = [
  /^https:\/\/[a-z0-9][a-z0-9-]*\.vercel\.app$/i,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
]

function resolveSiteUrl(req: Request): string {
  const origin = req.headers.get('Origin')?.replace(/\/$/, '')
  if (origin && ALLOWED_ORIGINS.some((re) => re.test(origin))) return origin

  const configured = Deno.env.get('SITE_URL')?.replace(/\/$/, '')
  if (configured) return configured

  return 'http://localhost:5173'
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Service-role client. Bypasses RLS — never hand this to a request body. */
function admin(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function requireUser(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await admin().auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
const isValidPhone = (v: string) => /^[1-9][0-9]{7,14}$/.test(v)

// ---------------------------------------------------------------------
// settlement — the single place an order's status is allowed to move
// ---------------------------------------------------------------------

interface OrderRow {
  id: string
  order_number: string
  status: string
  amount_inr: number | string
  gateway_provider: string | null
  gateway_ref: string | null
  product_id: string | null
}

async function settleOrder(
  db: SupabaseClient,
  order: OrderRow,
  status: NormalizedStatus,
  raw: unknown,
): Promise<{ changed: boolean; status: string }> {
  if (status === 'pending') return { changed: false, status: order.status }

  const target = status === 'paid' ? 'paid' : status === 'failed' ? 'failed' : 'cancelled'

  // Conditional update: only move an order that is still open. If a
  // duplicate callback arrives after the first one settled, this matches
  // zero rows and the whole call becomes a no-op. That, plus the unique
  // constraint on webhook_events, is the idempotency story.
  const { data, error } = await db
    .from('orders')
    .update({ status: target })
    .eq('id', order.id)
    .in('status', ['pending_payment', 'failed'])
    .select('id, status')

  if (error) throw error

  const changed = (data?.length ?? 0) > 0

  await db.from('payment_attempts').insert({
    order_id: order.id,
    gateway_provider: order.gateway_provider ?? 'unknown',
    gateway_ref: order.gateway_ref,
    status: status === 'paid' ? 'success' : 'failed',
    // Always our own amount. The callback's amount field is never trusted.
    amount_inr: order.amount_inr,
    raw_response: raw as never,
  })

  return { changed, status: changed ? target : order.status }
}

/**
 * Resolve the real status. For a gateway whose callback carries no
 * signature, the callback is only a hint that something happened — the
 * answer comes from asking the gateway directly with our API key.
 */
async function resolveStatus(
  claimed: NormalizedStatus,
  gatewayRef: string,
): Promise<{ status: NormalizedStatus; raw: unknown; confirmed: boolean }> {
  const gateway = getGateway()

  if (!gateway.requiresStatusConfirmation) {
    return { status: claimed, raw: { claimed }, confirmed: true }
  }

  try {
    const result = await gateway.fetchStatus(gatewayRef)
    return { status: result.status, raw: result.raw, confirmed: true }
  } catch (err) {
    // Never settle on a failed confirmation. Leaving the order open is the
    // safe direction: the buyer can retry verification from the return
    // screen, and nothing is delivered for free.
    return {
      status: 'pending',
      raw: { error: String(err), note: 'status confirmation failed' },
      confirmed: false,
    }
  }
}

// ---------------------------------------------------------------------
// POST /payments/create
// ---------------------------------------------------------------------

async function handleCreate(req: Request): Promise<Response> {
  const user = await requireUser(req)
  if (!user) return json({ error: 'You need to be signed in to place an order.' }, 401)

  const body = await req.json().catch(() => ({}))
  const productId = String(body.productId ?? '')
  const buyerName = String(body.buyerName ?? '').trim()
  const buyerEmail = String(body.buyerEmail ?? '').trim()
  const buyerWhatsapp = String(body.buyerWhatsapp ?? '').replace(/\D/g, '')
  const buyerNote = body.buyerNote ? String(body.buyerNote).slice(0, 1000) : null

  if (!productId) return json({ error: 'No product selected.' }, 400)
  if (!buyerName || buyerName.length < 2) return json({ error: 'Please enter your name.' }, 400)
  if (!isValidEmail(buyerEmail)) return json({ error: 'Please enter a valid email address.' }, 400)
  if (!isValidPhone(buyerWhatsapp)) {
    return json({ error: 'Please enter a valid WhatsApp number with country code.' }, 400)
  }

  const db = admin()

  const { data: settings } = await db.from('store_settings').select('is_store_open').maybeSingle()
  if (settings && settings.is_store_open === false) {
    return json({ error: 'The store is closed for new orders right now.' }, 503)
  }

  // The price comes from the database, never from the request body. This
  // is the line that stops a buyer from paying ₹1 for a ₹2,999 script.
  const { data: product, error: productError } = await db
    .from('products')
    .select('id, title, slug, price_inr, is_active')
    .eq('id', productId)
    .maybeSingle()

  if (productError) return json({ error: 'Could not load that product.' }, 500)
  if (!product || !product.is_active) return json({ error: 'That product is not available.' }, 404)

  const amount = Number(product.price_inr)

  // Reuse an open order rather than stacking one per click. A partial
  // unique index enforces this at the database level too.
  const { data: existing } = await db
    .from('orders')
    .select('id, order_number, status, amount_inr, gateway_provider, gateway_ref, product_id')
    .eq('user_id', user.id)
    .eq('product_id', product.id)
    .eq('status', 'pending_payment')
    .maybeSingle()

  let order = existing as OrderRow | null

  if (order) {
    await db
      .from('orders')
      .update({
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        buyer_whatsapp: buyerWhatsapp,
      })
      .eq('id', order.id)
  } else {
    const { data: created, error: insertError } = await db
      .from('orders')
      .insert({
        user_id: user.id,
        product_id: product.id,
        product_title_snapshot: product.title,
        product_slug_snapshot: product.slug,
        amount_inr: amount,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        buyer_whatsapp: buyerWhatsapp,
        buyer_note: buyerNote,
      })
      .select('id, order_number, status, amount_inr, gateway_provider, gateway_ref, product_id')
      .single()

    if (insertError || !created) {
      return json({ error: 'Could not create the order. Please try again.' }, 500)
    }
    order = created as OrderRow
  }

  const gateway = getGateway()
  const siteUrl = resolveSiteUrl(req)

  let initiated
  try {
    initiated = await gateway.initiate({
      orderId: order.id,
      orderNumber: order.order_number,
      amountInr: amount,
      customerName: buyerName,
      customerEmail: buyerEmail,
      customerPhone: buyerWhatsapp,
      productTitle: product.title,
      returnUrl: `${siteUrl}/checkout/return?order=${order.id}`,
      webhookUrl: `${SUPABASE_URL}/functions/v1/payments/webhook`,
    })
  } catch (err) {
    await db.from('payment_attempts').insert({
      order_id: order.id,
      gateway_provider: gateway.id,
      status: 'failed',
      amount_inr: amount,
      error_message: String(err),
    })
    return json(
      { error: 'The payment gateway is not responding. Please try again in a minute.' },
      502,
    )
  }

  await db
    .from('orders')
    .update({ gateway_provider: gateway.id, gateway_ref: initiated.gatewayRef })
    .eq('id', order.id)

  await db.from('payment_attempts').insert({
    order_id: order.id,
    gateway_provider: gateway.id,
    gateway_ref: initiated.gatewayRef,
    status: 'created',
    amount_inr: amount,
    raw_response: initiated.raw as never,
  })

  return json({
    orderId: order.id,
    orderNumber: order.order_number,
    amountInr: amount,
    redirectUrl: initiated.redirectUrl,
    provider: gateway.id,
  })
}

// ---------------------------------------------------------------------
// POST /payments/webhook  (public)
// ---------------------------------------------------------------------

async function handleWebhook(rawBody: string, headers: Headers): Promise<Response> {
  const db = admin()
  const gateway = getGateway()

  const parsed = await gateway.parseWebhook(rawBody, headers)

  if (!parsed.ok) {
    await db.from('webhook_events').insert({
      gateway_provider: gateway.id,
      event_id: `invalid:${crypto.randomUUID()}`,
      state: 'invalid',
      signature_ok: parsed.reason !== 'bad_signature' ? null : false,
      raw_body: rawBody.slice(0, 20_000),
      error_message: `${parsed.reason}${parsed.detail ? `: ${parsed.detail}` : ''}`,
      headers: Object.fromEntries(headers) as never,
    })
    // A bad signature is a real rejection. Everything else returns 200 so
    // the gateway does not enter a retry storm over a payload we will
    // never be able to process.
    return json({ error: parsed.reason }, parsed.reason === 'bad_signature' ? 401 : 200)
  }

  const event = parsed.event

  // Insert-first idempotency. A replay collides on (gateway_provider,
  // event_id) and stops here without touching the order a second time.
  const { error: dupeError } = await db.from('webhook_events').insert({
    gateway_provider: gateway.id,
    event_id: event.eventId,
    event_type: event.eventType,
    gateway_ref: event.gatewayRef,
    state: 'received',
    signature_ok: !gateway.requiresStatusConfirmation,
    raw_body: rawBody.slice(0, 20_000),
    headers: Object.fromEntries(headers) as never,
  })

  if (dupeError) {
    if (dupeError.code === '23505') {
      return json({ ok: true, duplicate: true })
    }
    throw dupeError
  }

  const markEvent = (state: string, extra: Record<string, unknown> = {}) =>
    db
      .from('webhook_events')
      .update({ state, processed_at: new Date().toISOString(), ...extra })
      .eq('gateway_provider', gateway.id)
      .eq('event_id', event.eventId)

  const { data: order } = await db
    .from('orders')
    .select('id, order_number, status, amount_inr, gateway_provider, gateway_ref, product_id')
    .eq('gateway_provider', gateway.id)
    .eq('gateway_ref', event.gatewayRef)
    .maybeSingle()

  if (!order) {
    await markEvent('ignored', { error_message: 'no matching order' })
    return json({ ok: true, ignored: 'unknown order' })
  }

  // This is the important step for an unsigned callback: ask the gateway.
  const resolved = await resolveStatus(event.status, event.gatewayRef)

  if (!resolved.confirmed) {
    await markEvent('error', { order_id: order.id, error_message: 'status confirmation failed' })
    return json({ ok: true, pending: true })
  }

  const result = await settleOrder(db, order as OrderRow, resolved.status, resolved.raw)
  await markEvent('processed', { order_id: order.id })

  return json({ ok: true, orderStatus: result.status, changed: result.changed })
}

// ---------------------------------------------------------------------
// POST /payments/verify  (auth)
//
// The buyer's return screen calls this. It exists because a callback can
// be late, blocked, or never sent at all — and a customer staring at
// "awaiting payment" after paying is the worst failure mode here.
// ---------------------------------------------------------------------

async function handleVerify(req: Request): Promise<Response> {
  const user = await requireUser(req)
  if (!user) return json({ error: 'Not signed in.' }, 401)

  const body = await req.json().catch(() => ({}))
  const orderId = String(body.orderId ?? '')
  if (!orderId) return json({ error: 'orderId is required.' }, 400)

  const db = admin()
  const { data: order } = await db
    .from('orders')
    .select(
      'id, order_number, status, amount_inr, gateway_provider, gateway_ref, product_id, user_id',
    )
    .eq('id', orderId)
    .maybeSingle()

  if (!order) return json({ error: 'Order not found.' }, 404)
  // Service role bypasses RLS, so ownership must be checked by hand here.
  if (order.user_id !== user.id) return json({ error: 'Order not found.' }, 404)

  if (order.status !== 'pending_payment' && order.status !== 'failed') {
    return json({ status: order.status, orderNumber: order.order_number })
  }

  if (!order.gateway_ref) {
    return json({ status: order.status, orderNumber: order.order_number })
  }

  const resolved = await resolveStatus('pending', order.gateway_ref)
  if (!resolved.confirmed) {
    return json({ status: order.status, orderNumber: order.order_number, unconfirmed: true })
  }

  const result = await settleOrder(db, order as OrderRow, resolved.status, resolved.raw)
  return json({ status: result.status, orderNumber: order.order_number })
}

// ---------------------------------------------------------------------
// POST /payments/mock-settle  (mock mode only)
//
// Signs a payload with the mock secret and runs it through the real
// webhook handler, so the simulator exercises the actual settlement path
// rather than a shortcut around it.
// ---------------------------------------------------------------------

async function handleMockSettle(req: Request): Promise<Response> {
  const gateway = getGateway()
  if (gateway.id !== 'mock') {
    return json({ error: 'The simulator is only available when GATEWAY_PROVIDER=mock.' }, 403)
  }

  const user = await requireUser(req)
  if (!user) return json({ error: 'Not signed in.' }, 401)

  const body = await req.json().catch(() => ({}))
  const gatewayRef = String(body.gatewayRef ?? '')
  const outcome = String(body.outcome ?? 'success')
  if (!gatewayRef) return json({ error: 'gatewayRef is required.' }, 400)

  const payload = JSON.stringify({
    event: outcome === 'success' ? 'payment.success' : 'payment.failed',
    event_id: `${gatewayRef}:${outcome}`,
    order_id: gatewayRef,
    status: outcome,
    amount: Number(body.amount ?? 0),
  })

  const headers = new Headers({
    'Content-Type': 'application/json',
    'x-mock-signature': await hmacSha256Hex(mockSecret(), payload),
  })

  return handleWebhook(payload, headers)
}

// ---------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  const action = url.pathname.split('/').filter(Boolean).pop() ?? ''

  try {
    switch (action) {
      case 'create':
        return await handleCreate(req)
      case 'webhook':
        return await handleWebhook(await req.text(), req.headers)
      case 'verify':
        return await handleVerify(req)
      case 'mock-settle':
        return await handleMockSettle(req)
      default:
        return json({ error: `Unknown action "${action}".` }, 404)
    }
  } catch (err) {
    console.error(`payments/${action} failed`, err)
    // Deliberately vague to the caller; the detail is in the function logs.
    return json({ error: 'Something went wrong processing the payment.' }, 500)
  }
})
