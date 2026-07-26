import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Category, ProductWithCategory, StoreSettings } from '@/types/database'

export type SortKey = 'newest' | 'price-asc' | 'price-desc' | 'popular'

export interface ProductFilters {
  search?: string
  category?: string
  sort?: SortKey
  page?: number
  perPage?: number
}

export const catalogKeys = {
  all: ['catalog'] as const,
  settings: () => [...catalogKeys.all, 'settings'] as const,
  categories: () => [...catalogKeys.all, 'categories'] as const,
  products: (f: ProductFilters) => [...catalogKeys.all, 'products', f] as const,
  product: (slug: string) => [...catalogKeys.all, 'product', slug] as const,
  featured: () => [...catalogKeys.all, 'featured'] as const,
}

export function useStoreSettings() {
  return useQuery({
    queryKey: catalogKeys.settings(),
    queryFn: async (): Promise<StoreSettings | null> => {
      const { data, error } = await supabase.from('store_settings').select('*').maybeSingle()
      if (error) throw error
      return data
    },
    staleTime: 5 * 60_000,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories(),
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data ?? []
    },
    staleTime: 5 * 60_000,
  })
}

export function useProducts(filters: ProductFilters) {
  const { search = '', category = '', sort = 'newest', page = 1, perPage = 12 } = filters

  return useQuery({
    queryKey: catalogKeys.products({ search, category, sort, page, perPage }),
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*, categories(id, name, slug)', { count: 'exact' })
        .eq('is_active', true)

      if (search.trim()) {
        const term = `%${search.trim()}%`
        query = query.or(`title.ilike.${term},short_description.ilike.${term}`)
      }

      if (category) {
        // Filter by category slug via the joined table.
        const { data: cat } = await supabase
          .from('categories')
          .select('id')
          .eq('slug', category)
          .maybeSingle()
        if (cat) query = query.eq('category_id', cat.id)
      }

      switch (sort) {
        case 'price-asc':
          query = query.order('price_inr', { ascending: true })
          break
        case 'price-desc':
          query = query.order('price_inr', { ascending: false })
          break
        case 'popular':
          query = query.order('sales_count', { ascending: false })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      const from = (page - 1) * perPage
      query = query.range(from, from + perPage - 1)

      const { data, error, count } = await query
      if (error) throw error

      return {
        items: (data ?? []) as unknown as ProductWithCategory[],
        total: count ?? 0,
        pageCount: Math.max(1, Math.ceil((count ?? 0) / perPage)),
      }
    },
    placeholderData: (prev) => prev,
  })
}

export function useFeaturedProducts() {
  return useQuery({
    queryKey: catalogKeys.featured(),
    queryFn: async (): Promise<ProductWithCategory[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(id, name, slug)')
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('created_at', { ascending: false })
        .limit(6)
      if (error) throw error
      return (data ?? []) as unknown as ProductWithCategory[]
    },
    staleTime: 60_000,
  })
}

export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: catalogKeys.product(slug ?? ''),
    enabled: Boolean(slug),
    queryFn: async (): Promise<ProductWithCategory | null> => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(id, name, slug)')
        .eq('slug', slug!)
        .eq('is_active', true)
        .maybeSingle()
      if (error) throw error

      // Fire-and-forget: a failed view count must never break the page.
      if (data) void supabase.rpc('bump_product_view', { p_product_id: data.id })

      return data as unknown as ProductWithCategory | null
    },
  })
}
