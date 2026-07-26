import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock, MessageCircle, ShieldCheck } from 'lucide-react'
import { Container } from '@/components/layout/PublicLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { LoadingScreen, EmptyState } from '@/components/ui/Feedback'
import { useAuth } from '@/features/auth/AuthProvider'
import { useProduct } from '@/features/catalog/queries'
import { createOrder } from '@/features/checkout/api'
import { formatPrice } from '@/lib/format'
import { gradientFor, isValidEmail, isValidWhatsApp, normalizeWhatsApp } from '@/lib/utils'

export function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user, profile, status } = useAuth()
  const { data: product, isLoading } = useProduct(slug)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Prefill from the profile once it loads, without clobbering typing.
  useEffect(() => {
    if (profile?.full_name) setName((v) => v || profile.full_name!)
    if (user?.email) setEmail((v) => v || user.email!)
    if (profile?.whatsapp) setWhatsapp((v) => v || profile.whatsapp!)
  }, [profile, user])

  if (status === 'loading' || isLoading) return <LoadingScreen />

  if (!product) {
    return (
      <Container className="py-10">
        <EmptyState title="Product not found" description="This product is no longer available." />
      </Container>
    )
  }

  function validate() {
    const next: Record<string, string> = {}
    if (name.trim().length < 2) next.name = 'Please enter your full name.'
    if (!isValidEmail(email)) next.email = 'Please enter a valid email address.'

    const normalized = normalizeWhatsApp(whatsapp)
    if (!isValidWhatsApp(normalized)) {
      next.whatsapp = 'Enter a valid number with country code, e.g. 919876543210.'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (!validate() || !product) return

    setSubmitting(true)
    try {
      const result = await createOrder({
        productId: product.id,
        buyerName: name.trim(),
        buyerEmail: email.trim(),
        buyerWhatsapp: normalizeWhatsApp(whatsapp),
        buyerNote: note.trim() || undefined,
      })

      // The gateway URL may be off-site, so a full navigation is correct
      // here rather than a client-side route change.
      if (result.redirectUrl.startsWith(window.location.origin)) {
        navigate(result.redirectUrl.replace(window.location.origin, ''))
      } else {
        window.location.href = result.redirectUrl
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not start the payment.')
      setSubmitting(false)
    }
  }

  return (
    <Container className="py-8">
      <Link
        to={`/products/${product.slug}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to product
      </Link>

      <h1 className="mt-5 font-display text-3xl font-bold">Checkout</h1>
      <p className="mt-1.5 text-sm text-[var(--text-muted)]">
        We use these details to send you the files after payment — please double-check them.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              label="Full name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              autoComplete="name"
              placeholder="Your name"
            />

            <Input
              label="Email address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
              placeholder="you@example.com"
              hint="Your order receipt and files can be sent here."
            />

            <Input
              label="WhatsApp number"
              type="tel"
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              error={errors.whatsapp}
              autoComplete="tel"
              placeholder="919876543210"
              hint="Include the country code, no + sign. Indian numbers get 91 added automatically."
            />

            <Textarea
              label="Anything we should know? (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Server details, customisation requests, questions…"
              rows={3}
              maxLength={1000}
            />

            {formError && (
              <p
                role="alert"
                className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-4 py-3 text-sm text-[var(--danger)]"
              >
                {formError}
              </p>
            )}

            <Button type="submit" size="lg" fullWidth loading={submitting}>
              <Lock className="size-4" aria-hidden />
              Pay {formatPrice(product.price_inr)}
            </Button>

            <p className="text-center text-xs text-[var(--text-muted)]">
              By continuing you agree to our{' '}
              <Link to="/terms" className="underline">
                terms
              </Link>{' '}
              and{' '}
              <Link to="/refund-policy" className="underline">
                refund policy
              </Link>
              .
            </p>
          </form>
        </Card>

        <div className="space-y-4 lg:sticky lg:top-24">
          <Card elevation="raised">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Order summary
            </h2>

            <div className="mt-4 flex gap-3">
              <div className="size-16 shrink-0 overflow-hidden rounded-xl">
                {product.cover_image_url ? (
                  <img src={product.cover_image_url} alt="" className="size-full object-cover" />
                ) : (
                  <div className="size-full" style={{ background: gradientFor(product.slug) }} aria-hidden />
                )}
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-medium">{product.title}</p>
                {product.version && (
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">v{product.version}</p>
                )}
              </div>
            </div>

            <dl className="mt-5 space-y-2 border-t border-[var(--glass-edge-lo)] pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--text-muted)]">Subtotal</dt>
                <dd className="tnum">{formatPrice(product.price_inr)}</dd>
              </div>
              <div className="flex justify-between border-t border-[var(--glass-edge-lo)] pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="tnum">{formatPrice(product.price_inr)}</dd>
              </div>
            </dl>
          </Card>

          <Card className="text-sm">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--success)]" aria-hidden />
              <p className="text-[var(--text-secondary)]">
                Payment is handled by the gateway. This site never receives your card, UPI PIN or
                bank details.
              </p>
            </div>
            <div className="mt-3 flex items-start gap-2.5">
              <MessageCircle className="mt-0.5 size-4 shrink-0 text-[var(--color-brand-500)] dark:text-[var(--color-brand-300)]" aria-hidden />
              <p className="text-[var(--text-secondary)]">
                After payment your order appears under <strong>My orders</strong>, and we send the
                files to the contact details above.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </Container>
  )
}
