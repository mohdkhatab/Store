import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Check,
  Clock,
  Download,
  ExternalLink,
  MessageCircle,
  PackageSearch,
  ShieldCheck,
} from 'lucide-react'
import { Container } from '@/components/layout/PublicLayout'
import { Card } from '@/components/ui/Card'
import { LinkButton } from '@/components/ui/Button'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { useProduct, useStoreSettings } from '@/features/catalog/queries'
import { discountPercent, formatPrice } from '@/lib/format'
import { gradientFor } from '@/lib/utils'
import { supportWhatsappLink } from '@/lib/contact'

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: product, isLoading } = useProduct(slug)
  const { data: settings } = useStoreSettings()

  if (isLoading) {
    return (
      <Container className="py-10">
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-4">
            <Skeleton className="aspect-[16/9] w-full" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <Skeleton className="h-72 w-full" />
        </div>
      </Container>
    )
  }

  if (!product) {
    return (
      <Container className="py-10">
        <EmptyState
          icon={PackageSearch}
          title="Product not found"
          description="This product may have been removed or renamed."
          action={
            <LinkButton to="/products" variant="glass" size="sm">
              Browse all products
            </LinkButton>
          }
        />
      </Container>
    )
  }

  const off = discountPercent(product.price_inr, product.compare_at_price)

  return (
    <Container className="py-8">
      <Link
        to="/products"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to products
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-6">
          <div className="glass overflow-hidden p-0">
            <div className="aspect-[16/9]">
              {product.cover_image_url ? (
                <img
                  src={product.cover_image_url}
                  alt={product.title}
                  className="size-full object-cover"
                />
              ) : (
                <div className="size-full" style={{ background: gradientFor(product.slug) }} aria-hidden />
              )}
            </div>
          </div>

          {product.gallery_urls.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {product.gallery_urls.map((url) => (
                <img
                  key={url}
                  src={url}
                  alt=""
                  loading="lazy"
                  className="glass-flat aspect-video w-full object-cover"
                />
              ))}
            </div>
          )}

          <div>
            {product.categories && (
              <Link
                to={`/products?category=${product.categories.slug}`}
                className="text-sm font-medium text-[var(--color-brand-500)] hover:underline dark:text-[var(--color-brand-300)]"
              >
                {product.categories.name}
              </Link>
            )}
            <h1 className="mt-1.5 font-display text-3xl font-bold sm:text-4xl">{product.title}</h1>
            {product.short_description && (
              <p className="mt-3 text-base leading-relaxed text-[var(--text-secondary)]">
                {product.short_description}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[var(--text-muted)]">
              {product.version && <span>Version {product.version}</span>}
              {product.sales_count > 0 && (
                <span className="flex items-center gap-1.5">
                  <Download className="size-4" aria-hidden />
                  {product.sales_count} sold
                </span>
              )}
            </div>
          </div>

          {product.tech_stack.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                Built with
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {product.tech_stack.map((tech) => (
                  <span key={tech} className="glass-flat px-3 py-1.5 text-sm">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          )}

          {product.features.length > 0 && (
            <div>
              <h2 className="font-display text-xl font-bold">What you get</h2>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {product.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-[var(--success)]"
                      aria-hidden
                    />
                    <span className="text-[var(--text-secondary)]">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.description && (
            <div>
              <h2 className="font-display text-xl font-bold">Description</h2>
              {/* Rendered as plain text, not HTML. The description is admin
                  authored, but injecting markup here would hand an XSS
                  vector straight into every visitor's session. */}
              <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[var(--text-secondary)]">
                {product.description}
              </div>
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-24">
          <Card elevation="raised">
            <div className="flex items-baseline gap-3">
              <span className="tnum font-display text-3xl font-bold">
                {formatPrice(product.price_inr)}
              </span>
              {off !== null && (
                <>
                  <span className="tnum text-base text-[var(--text-muted)] line-through">
                    {formatPrice(product.compare_at_price)}
                  </span>
                  <span className="rounded-full bg-[var(--success)]/15 px-2 py-0.5 text-xs font-semibold text-[var(--success)]">
                    {off}% off
                  </span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">One-time payment. No subscription.</p>

            <div className="mt-5 space-y-2.5">
              <LinkButton to={`/checkout/${product.slug}`} size="lg" fullWidth>
                Buy now
              </LinkButton>
              {product.demo_url && (
                <a
                  href={product.demo_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium text-[var(--text-primary)] neu-raised"
                >
                  View live demo
                  <ExternalLink className="size-4" aria-hidden />
                </a>
              )}
            </div>

            <ul className="mt-6 space-y-3 border-t border-[var(--glass-edge-lo)] pt-5 text-sm">
              <li className="flex items-start gap-2.5">
                <MessageCircle className="mt-0.5 size-4 shrink-0 text-[var(--color-brand-500)] dark:text-[var(--color-brand-300)]" aria-hidden />
                <span className="text-[var(--text-secondary)]">
                  Delivered to your WhatsApp or email — no download links to expire.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Clock className="mt-0.5 size-4 shrink-0 text-[var(--color-brand-500)] dark:text-[var(--color-brand-300)]" aria-hidden />
                <span className="text-[var(--text-secondary)]">
                  Usually sent within a few hours of payment.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-[var(--color-brand-500)] dark:text-[var(--color-brand-300)]" aria-hidden />
                <span className="text-[var(--text-secondary)]">
                  Secure payment. We never see your card or UPI details.
                </span>
              </li>
            </ul>

            {settings?.whatsapp_number && (
              <a
                href={supportWhatsappLink(settings.whatsapp_number)}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-5 flex items-center justify-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <MessageCircle className="size-4" aria-hidden />
                Ask a question first
              </a>
            )}
          </Card>
        </div>
      </div>
    </Container>
  )
}
