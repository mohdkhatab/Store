import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { catalogKeys } from '@/features/catalog/queries'
import { orderKeys } from '@/features/orders/queries'
import type {
  Category,
  Order,
  OrderStatus,
  Product,
  StoreSettings,
  TablesInsert,
  TablesUpdate,
} from '@/types/database'
import { toNumber } from '@/lib/utils'

/** The order tabs in the admin UI, plus the catch-all. */
export type OrderFilter = OrderStatus | 'all'

export const adminKeys = {
  all: ['admin'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
  orders: (status: string) => [...adminKeys.all, 'orders', status] as const,
  products: () => [...adminKeys.all, 'products'] as const,
  product: (id: string) => [...adminKeys.all, 'product', id] as const,
  categories: () => [...adminKeys.all, 'categories'] as const,
}

/**
 * Every query below relies on RLS to decide what comes back: an admin sees
 * all rows, anyone else sees nothing. There is no client-side role check
 * doing the filtering, on purpose.
 */

export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('status, amount_inr, created_at, paid_at')
      if (error) throw error

      const rows = orders ?? []
      const paidLike = rows.filter((o) => o.status === 'paid' || o.status === 'delivered')
      const revenue = paidLike.reduce((sum, o) => sum + toNumber(o.amount_inr), 0)

      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
      const recentRevenue = paidLike
        .filter((o) => o.paid_at && new Date(o.paid_at).getTime() >= thirtyDaysAgo)
        .reduce((sum, o) => sum + toNumber(o.amount_inr), 0)

      const { count: productCount } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })

      return {
        totalOrders: rows.length,
        awaitingPayment: rows.filter((o) => o.status === 'pending_payment').length,
        readyToDeliver: rows.filter((o) => o.status === 'paid').length,
        delivered: rows.filter((o) => o.status === 'delivered').length,
        revenue,
        recentRevenue,
        productCount: productCount ?? 0,
      }
    },
  })
}

export function useAdminOrders(status: OrderFilter) {
  return useQuery({
    queryKey: adminKeys.orders(status),
    queryFn: async (): Promise<Order[]> => {
      let query = supabase.from('orders').select('*')
      if (status !== 'all') query = query.eq('status', status)
      const { data, error } = await query.order('created_at', { ascending: false }).limit(200)
      if (error) throw error
      return data ?? []
    },
  })
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      orderId,
      status,
      adminNote,
    }: {
      orderId: string
      status: OrderStatus
      adminNote?: string
    }) => {
      // `status` and `admin_note` are the only order columns an admin
      // session has an UPDATE grant on. Amount is not writable by anyone.
      const patch: TablesUpdate<'orders'> = { status }
      if (adminNote !== undefined) patch.admin_note = adminNote

      const { error } = await supabase.from('orders').update(patch).eq('id', orderId)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.all })
      void qc.invalidateQueries({ queryKey: orderKeys.all })
    },
  })
}

export function useAdminProducts() {
  return useQuery({
    queryKey: adminKeys.products(),
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useAdminProduct(id: string | undefined) {
  return useQuery({
    queryKey: adminKeys.product(id ?? ''),
    enabled: Boolean(id) && id !== 'new',
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase.from('products').select('*').eq('id', id!).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useSaveProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string
      values: TablesInsert<'products'>
    }) => {
      if (id) {
        const { error } = await supabase.from('products').update(values).eq('id', id)
        if (error) throw error
        return id
      }
      const { data, error } = await supabase.from('products').insert(values).select('id').single()
      if (error) throw error
      return data.id
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.all })
      void qc.invalidateQueries({ queryKey: catalogKeys.all })
    },
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.all })
      void qc.invalidateQueries({ queryKey: catalogKeys.all })
    },
  })
}

export function useAdminCategories() {
  return useQuery({
    queryKey: adminKeys.categories(),
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase.from('categories').select('*').order('sort_order')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useSaveCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string
      values: TablesInsert<'categories'>
    }) => {
      if (id) {
        const { error } = await supabase.from('categories').update(values).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('categories').insert(values)
        if (error) throw error
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.all })
      void qc.invalidateQueries({ queryKey: catalogKeys.all })
    },
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: adminKeys.all })
      void qc.invalidateQueries({ queryKey: catalogKeys.all })
    },
  })
}

export function useSaveSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<StoreSettings>) => {
      const { error } = await supabase.from('store_settings').update(values).eq('singleton', true)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: catalogKeys.settings() })
    },
  })
}

/** Uploads to the one bucket that exists. Sold scripts never go here. */
export async function uploadProductImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage.from('product-images').upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw error

  const { data } = supabase.storage.from('product-images').getPublicUrl(path)
  return data.publicUrl
}
