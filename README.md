# UX Store

A storefront for selling scripts and source code. Buyers pay through
PrimePay; the owner then delivers the files by hand over WhatsApp or email.
No product files are ever hosted on the site.

**Stack:** Vite + React 19 + TypeScript + Tailwind v4 → Vercel ·
Supabase (Postgres + Auth + RLS + Edge Functions + Storage)

---

## Setup

### 1. Install and run

```bash
npm install
cp .env.example .env     # fill in the two Supabase values
npm run dev
```

`.env` (browser-visible, safe to expose — RLS is what protects the data):

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
VITE_SITE_URL=http://localhost:5173
```

### 2. Edge Function secrets

Supabase dashboard → **Edge Functions → Secrets**. These never reach the
browser:

| Secret | Value | Notes |
|---|---|---|
| `GATEWAY_PROVIDER` | `mock` \| `primepay` \| `manual` | Start on `mock` |
| `PRIMEPAY_API_KEY` | your PrimePay key | From PrimePay → Settings |
| `PRIMEPAY_BASE_URL` | `https://primeqr.onrender.com` | Optional, this is the default |
| `SITE_URL` | `https://your-domain.com` | Where buyers are sent back to |
| `MOCK_GATEWAY_SECRET` | any random string | Simulator only |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically —
do not set them yourself.

### 3. Make yourself an admin

Sign up on the site first, then run this once in the Supabase SQL editor:

```sql
update public.profiles set role = 'admin' where id =
  (select id from auth.users where email = 'you@example.com');
```

Sign out and back in, then `/admin` becomes available.

### 4. Deploy

Vercel picks up `vercel.json` automatically. Set the three `VITE_*` variables
in the Vercel project, and add your production URL to Supabase →
**Authentication → URL Configuration** (Site URL + Redirect URLs, including
`https://*.vercel.app/**` if you want preview deploys to work).

---

## How payments work

```
Browser ──► Edge Function /payments/create ──► PrimePay create-payment
              price read from products table          │
                                                      ▼
                                            buyer pays on PrimePay
                                                      │
PrimePay ──callback──► /payments/webhook              │
                          │                           │
                          └──► GET /api/payment-status/:id  ◄── the real check
                                        │
                                        ▼
                              order status = paid
```

Three rules hold the money side together:

**1. The price never comes from the browser.** `/payments/create` looks up
`products.price_inr` server-side and ignores anything the client sends. The
`orders` table has no `INSERT` or `UPDATE` grant for a normal session at all,
so there is no path from a browser to an order's amount or status.

**2. The PrimePay callback is never trusted on its own.** It carries no
signature — anyone who learns the callback URL could POST
`{"order_id":"…","status":"success"}`. So the callback is treated purely as a
nudge: the function then calls `GET /api/payment-status/:order_id` with the
API key and settles only on what PrimePay itself reports. PrimePay's own docs
say to do this. If that confirmation call fails, the order deliberately stays
open rather than settling optimistically.

**3. The callback's `amount` is ignored.** The charge was created by us at a
price read from our own database, so `orders.amount_inr` is the only figure
that matters.

Idempotency comes from two places: a unique index on
`webhook_events (gateway_provider, event_id)` rejects replays, and the
settlement `UPDATE` is conditional on the order still being open, so a
duplicate matches zero rows and changes nothing.

### Swapping the gateway

`supabase/functions/payments/gateway.ts` holds every gateway in one file
behind a single `PaymentGateway` interface. To change provider, add an
implementation and flip `GATEWAY_PROVIDER`. Nothing else in the codebase
knows how payments are taken.

- `mock` — an in-app fake checkout at `/checkout/mock` with
  **Simulate success / Simulate failure** buttons. It signs a payload and
  runs it through the *real* webhook handler, so it exercises signature
  checking, idempotency and the status machine rather than shortcutting them.
- `primepay` — the live integration.
- `manual` — UPI/QR with no API; the admin marks orders paid by hand. Useful
  as a fallback if PrimePay is unreachable.

---

## Security model

The frontend is a static SPA holding a publishable key, so **Postgres RLS is
the only real boundary**. Notable decisions:

- **Admin checks** go through `public.is_admin()`, a `SECURITY DEFINER`
  function with a pinned `search_path`. Reading the role inside a policy on
  the same table it protects would recurse infinitely; the definer function
  breaks that cycle. Catalogue policies are split by role so the `anon` role
  never needs `EXECUTE` on it.
- **Privilege escalation** is blocked by column grants, not by policy logic:
  a session simply has no `UPDATE` privilege on `profiles.role`, so
  `set role = 'admin'` fails before RLS is consulted.
- **Order status transitions** are validated by a database trigger
  (`guard_order_transition`), so no code path — webhook, admin UI, or a
  future script — can jump an order from unpaid straight to delivered.
- **The audit trail writes itself.** `order_events` rows are inserted by
  triggers, not application code, and the table has no write grant for
  anyone, so status history cannot be edited after the fact.
- **Storage** has exactly one bucket, for product cover images. The scripts
  being sold never touch it — that is the point of manual delivery.

Verified against a live database by impersonating real sessions:

| Attack | Result |
|---|---|
| Buyer marks own order `paid` | Blocked (RLS matches 0 rows) |
| Buyer rewrites `amount_inr` | Blocked (`42501`, no column grant) |
| Buyer sets own `role = 'admin'` | Blocked (`42501`, no column grant) |
| Buyer inserts an order at their own price | Blocked (`42501`, no insert grant) |
| Buyer A reads Buyer B's orders | 0 rows |
| Anonymous visitor reads orders / payments | 0 rows |
| Admin jumps `pending_payment → delivered` | Blocked (`22023`, transition guard) |
| Same webhook delivered twice | Second is a no-op |

Buyers keep the ability they need — updating their own name and WhatsApp
number still works.

---

## Project layout

```
src/
  components/{ui,layout,theme}   glass primitives, shell, theming
  features/{auth,catalog,checkout,orders,admin}
  routes/{guards,pages}
  lib/                           supabase client, formatting, wa.me links
supabase/
  migrations/                    0001 schema · 0002 RLS · 0003 hardening
                                 0004 seed · 0005 advisor fixes
  functions/payments/            index.ts (routes) + gateway.ts (adapters)
```

## Design notes

The liquid-glass look is three stacked effects, not one blur: backdrop
refraction (`blur` + `saturate`), a body tint with a top sheen, and a masked
1px gradient hairline. `AuroraBackground` is load-bearing — with a flat page
behind it, `backdrop-filter` has nothing to refract and every panel looks like
a grey box.

Product grid cards deliberately use `.glass-flat`, which has **no**
`backdrop-filter`. Two dozen blurred cards in a scrolling grid drop a
mid-range Android below 20 fps, and the effect is invisible at card size.

Glass also has a real accessibility cost: text contrast over a blur depends
on whatever happens to be behind it. So text always sits on a semi-opaque
fill, and `prefers-reduced-transparency`, `prefers-contrast: more` and
`forced-colors` each fall back to solid panels. There is a manual
**Reduce transparency** switch in admin settings as well, which doubles as a
performance escape hatch on older phones.

## Known limits

- **SEO / link previews.** This is a client-rendered SPA, so a product link
  shared on WhatsApp shows no title or preview image. Worth adding
  prerendering for `/products/:slug` before pushing traffic through social
  channels.
- **PrimePay runs on Render's free tier**, which sleeps after inactivity. The
  first payment after a quiet period can take ~30–45s to start. Gateway calls
  allow 45s, and the return screen retries with backoff, but pinging
  `/api/healthz` on a schedule would avoid it entirely.
- **Supabase free projects pause** after about a week of inactivity, which
  takes the store offline until resumed.
