import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PackageSearch, Search } from 'lucide-react'
import { Container } from '@/components/layout/PublicLayout'
import { Input, Select } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState } from '@/components/ui/Feedback'
import { ProductCard, ProductCardSkeleton } from '@/features/catalog/ProductCard'
import { useCategories, useProducts, type SortKey } from '@/features/catalog/queries'
import { cn } from '@/lib/utils'

const PER_PAGE = 12

export function ProductsPage() {
  // Filters live in the URL so a filtered list is shareable and the back
  // button behaves the way people expect.
  const [params, setParams] = useSearchParams()
  const search = params.get('q') ?? ''
  const category = params.get('category') ?? ''
  const sort = (params.get('sort') as SortKey) ?? 'newest'
  const page = Math.max(1, Number(params.get('page') ?? 1))

  const [searchInput, setSearchInput] = useState(search)
  const { data: categories } = useCategories()
  const { data, isLoading, isError, refetch } = useProducts({
    search,
    category,
    sort,
    page,
    perPage: PER_PAGE,
  })

  // Debounce so typing does not fire a query per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput === search) return
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (searchInput) next.set('q', searchInput)
          else next.delete('q')
          next.delete('page')
          return next
        },
        { replace: true },
      )
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput, search, setParams])

  function update(key: string, value: string) {
    setParams((prev) => {
      const next = new URLSearchParams(prev)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'page') next.delete('page')
      return next
    })
  }

  const hasFilters = Boolean(search || category || sort !== 'newest')

  return (
    <Container className="py-10">
      <header>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">All products</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {data ? `${data.total} product${data.total === 1 ? '' : 's'} available` : 'Loading…'}
        </p>
      </header>

      <div className="glass mt-6 flex flex-col gap-3 p-4 lg:flex-row lg:items-end">
        <Input
          label="Search"
          placeholder="Search scripts, templates, bots…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          prefix={<Search className="size-4" aria-hidden />}
          wrapperClassName="flex-1"
          className="pl-11"
        />
        <Select
          label="Sort by"
          value={sort}
          onChange={(e) => update('sort', e.target.value)}
          wrapperClassName="lg:w-48"
        >
          <option value="newest">Newest first</option>
          <option value="popular">Most popular</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </Select>
      </div>

      {categories && categories.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <FilterChip active={!category} onClick={() => update('category', '')}>
            All
          </FilterChip>
          {categories.map((c) => (
            <FilterChip
              key={c.id}
              active={category === c.slug}
              onClick={() => update('category', c.slug)}
            >
              {c.name}
            </FilterChip>
          ))}
        </div>
      )}

      <div className="mt-8">
        {isError ? (
          <ErrorState
            description="We could not load the product list."
            onRetry={() => void refetch()}
          />
        ) : isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            {data.pageCount > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
                <Button
                  variant="glass"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => update('page', String(page - 1))}
                >
                  Previous
                </Button>
                <span className="tnum px-3 text-sm text-[var(--text-muted)]">
                  Page {page} of {data.pageCount}
                </span>
                <Button
                  variant="glass"
                  size="sm"
                  disabled={page >= data.pageCount}
                  onClick={() => update('page', String(page + 1))}
                >
                  Next
                </Button>
              </nav>
            )}
          </>
        ) : (
          <EmptyState
            icon={PackageSearch}
            title="No products found"
            description={
              hasFilters
                ? 'Try a different search term or clear the filters.'
                : 'Nothing has been listed yet. Check back soon.'
            }
            action={
              hasFilters ? (
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => {
                    setSearchInput('')
                    setParams({})
                  }}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        )}
      </div>
    </Container>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'brand-gradient text-white'
          : 'text-[var(--text-secondary)] neu-raised hover:text-[var(--text-primary)]',
      )}
    >
      {children}
    </button>
  )
}
