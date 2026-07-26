import { Link } from 'react-router-dom'
import { ArrowUpRight, Download } from 'lucide-react'
import type { ProductWithCategory } from '@/types/database'
import { formatPrice, discountPercent } from '@/lib/format'
import { gradientFor } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Feedback'

export function ProductCard({ product }: { product: ProductWithCategory }) {
  const off = discountPercent(product.price_inr, product.compare_at_price)

  return (
    <Link
      to={`/products/${product.slug}`}
      className="glass-flat group flex flex-col overflow-hidden transition-transform duration-200 hover:-translate-y-1 motion-reduce:hover:translate-y-0"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        {product.cover_image_url ? (
          <img
            src={product.cover_image_url}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:group-hover:scale-100"
          />
        ) : (
          // Deterministic gradient stands in for missing art, so a product
          // without a cover still looks deliberate rather than broken.
          <div
            className="size-full"
            style={{ background: gradientFor(product.slug) }}
            aria-hidden
          />
        )}

        {off !== null && (
          <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {off}% off
          </span>
        )}

        {product.categories && (
          <span className="scrim absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)]">
            {product.categories.name}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 font-display text-base font-semibold">{product.title}</h3>
        {product.short_description && (
          <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-[var(--text-muted)]">
            {product.short_description}
          </p>
        )}

        {product.tech_stack.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {product.tech_stack.slice(0, 3).map((tech) => (
              <span
                key={tech}
                className="rounded-md bg-[var(--glass-fill-lo)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]"
              >
                {tech}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-end justify-between gap-2 pt-1">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="tnum font-display text-lg font-bold">
                {formatPrice(product.price_inr)}
              </span>
              {off !== null && (
                <span className="tnum text-xs text-[var(--text-muted)] line-through">
                  {formatPrice(product.compare_at_price)}
                </span>
              )}
            </div>
            {product.sales_count > 0 && (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                <Download className="size-3" aria-hidden />
                {product.sales_count} sold
              </p>
            )}
          </div>
          <span className="grid size-9 shrink-0 place-items-center rounded-xl text-[var(--text-secondary)] transition-colors group-hover:text-[var(--text-primary)] neu-raised">
            <ArrowUpRight className="size-4" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="glass-flat overflow-hidden">
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-7 w-24" />
      </div>
    </div>
  )
}
