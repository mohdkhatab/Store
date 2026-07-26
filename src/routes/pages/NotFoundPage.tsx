import { Container } from '@/components/layout/PublicLayout'
import { LinkButton } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export function NotFoundPage() {
  return (
    <Container className="py-20">
      <Card elevation="raised" className="mx-auto max-w-md text-center">
        <p className="brand-text font-display text-6xl font-bold">404</p>
        <h1 className="mt-3 font-display text-xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          The page you were looking for does not exist or has moved.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
          <LinkButton to="/">Go home</LinkButton>
          <LinkButton to="/products" variant="glass">
            Browse products
          </LinkButton>
        </div>
      </Card>
    </Container>
  )
}
