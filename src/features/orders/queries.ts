import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Order, OrderEvent } from '@/types/database'

export const orderKeys = {
  all: ['orders'] as const,
  mine: () => [...orderKeys.all, 'mine'] as const,
  one: (id: string) => [...orderKeys.all, 'one', id] as const,
  events: (id: string) => [...orderKeys.all, 'events', id] as const,
}

/**
 * No user_id filter here on purpose — RLS already restricts this to the
 * caller's own rows. Adding a client-side filter would imply the security
 * lives in this query, which it does not.
 */
export function useMyOrders() {
  return useQuery({
    queryKey: orderKeys.mine(),
    queryFn: async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useOrder(orderId: string | undefined, options?: { poll?: boolean }) {
  return useQuery({
    queryKey: orderKeys.one(orderId ?? ''),
    enabled: Boolean(orderId),
    queryFn: async (): Promise<Order | null> => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
    // The webhook lands asynchronously, so the return-from-gateway screen
    // polls until the status settles rather than guessing.
    refetchInterval: options?.poll
      ? (query) => {
          const status = query.state.data?.status
          return status === 'pending_payment' ? 3000 : false
        }
      : false,
  })
}

export function useOrderEvents(orderId: string | undefined) {
  return useQuery({
    queryKey: orderKeys.events(orderId ?? ''),
    enabled: Boolean(orderId),
    queryFn: async (): Promise<OrderEvent[]> => {
      const { data, error } = await supabase
        .from('order_events')
        .select('*')
        .eq('order_id', orderId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data ?? []
    },
  })
}
