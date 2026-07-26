import { Link } from 'react-router-dom'
import { ArrowRight, MessageCircle, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { Container } from '@/components/layout/PublicLayout'
import { LinkButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ProductCard, ProductCardSkeleton } from '@/features/catalog/ProductCard'
import { useCategories, useFeaturedProducts, useStoreSettings } from '@/features/catalog/queries'

export function HomePage() {
  const { data: settings } = useStoreSettings()
  const { data: featured, isLoading } = useFeaturedProducts()
  const { data: categories } = useCategories()

  return (
    <>
      <section className="pt-14 sm:pt-20">
        <Container>
          <div className="mx-auto max-w-3xl text-center">
            <span className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium">
              <Sparkles className="size-3.5 text-[var(--color-brand-400)]" aria-hidden />
              Hand-built source code, delivered personally
            </span>

            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
              {settings?.hero_headline ?? 'Production-ready scripts, delivered personally.'}
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-[var(--text-muted)] sm:text-lg">
              {settings?.hero_subheadline ??
                'Hand-built source code for real projects. Pay online, get your files on WhatsApp or email within hours.'}
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <LinkButton to="/products" size="lg">
                Browse products
                <ArrowRight className="size-4" aria-hidden />
              </LinkButton>
              <LinkButton to="/contact" variant="glass" size="lg">
                Talk to us first
              </LinkButton>
            </div>
          </div>

          <div className="mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-3">
            <Feature
              icon={ShieldCheck}
              title="Secure checkout"
              body="Payments run through a verified gateway. We never see or store your payment details."
            />
            <Feature
              icon={MessageCircle}
              title="Personal delivery"
              body="Your files arrive on WhatsApp or email from a real person, not an automated link."
            />
            <Feature
              icon={Zap}
              title="Setup help included"
              body="Stuck installing it? Message us and we will walk you through it."
            />
          </div>
        </Container>
      </section>

      <section className="mt-20">
        <Container>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold sm:text-3xl">Featured products</h2>
              <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                The scripts people buy most often.
              </p>
            </div>
            <Link
              to="/products"
              className="hidden shrink-0 items-center gap-1 text-sm font-medium text-[var(--color-brand-500)] hover:underline sm:flex dark:text-[var(--color-brand-300)]"
            >
              View all
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading
              ? Array.from({ length: 3 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : featured?.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>

          {!isLoading && !featured?.length && (
            <Card className="mt-6 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                No featured products yet. <Link to="/products" className="underline">Browse everything</Link>.
              </p>
            </Card>
          )}
        </Container>
      </section>

      {categories && categories.length > 0 && (
        <section className="mt-20">
          <Container>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">Browse by category</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {categories.map((c) => (
                <Link
                  key={c.id}
                  to={`/products?category=${c.slug}`}
                  className="glass-flat group p-5 transition-transform duration-200 hover:-translate-y-1 motion-reduce:hover:translate-y-0"
                >
                  <h3 className="font-display text-base font-semibold">{c.name}</h3>
                  {c.description && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-[var(--text-muted)]">
                      {c.description}
                    </p>
                  )}
                  <span className="mt-3 flex items-center gap-1 text-sm font-medium text-[var(--color-brand-500)] dark:text-[var(--color-brand-300)]">
                    Explore
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}

      <section className="mt-20">
        <Container>
          <Card elevation="raised" className="text-center">
            <h2 className="font-display text-2xl font-bold">How delivery works</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--text-muted)]">
              We do not host download links. Every order is sent by hand, so you always get the
              right files and a person to ask if something breaks.
            </p>
            <ol className="mx-auto mt-8 grid max-w-3xl gap-6 text-left sm:grid-cols-3">
              {[
                ['Pick a product', 'Choose a script and enter your email and WhatsApp number.'],
                ['Pay securely', 'Complete payment through the gateway. Your order updates instantly.'],
                ['Get your files', 'We send the source code to your WhatsApp or email, usually within a few hours.'],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-3">
                  <span className="brand-gradient grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold">{title}</h3>
                    <p className="mt-1 text-sm text-[var(--text-muted)]">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </Container>
      </section>
    </>
  )
}

function Feature({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  body: string
}) {
  return (
    <div className="glass-flat p-5 text-left">
      <div className="grid size-10 place-items-center rounded-xl neu-well">
        <Icon className="size-4.5 text-[var(--color-brand-500)] dark:text-[var(--color-brand-300)]" aria-hidden />
      </div>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">{body}</p>
    </div>
  )
}
