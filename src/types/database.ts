/**
 * Generated from the live schema. Regenerate after every migration:
 *   supabase gen types typescript --project-id <ref> > src/types/database.ts
 * Domain aliases used across the app are at the bottom of this file.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.5' }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      order_events: {
        Row: {
          actor: Database['public']['Enums']['event_actor']
          actor_id: string | null
          created_at: string
          from_status: Database['public']['Enums']['order_status'] | null
          id: string
          note: string | null
          order_id: string
          to_status: Database['public']['Enums']['order_status']
        }
        Insert: {
          actor?: Database['public']['Enums']['event_actor']
          actor_id?: string | null
          created_at?: string
          from_status?: Database['public']['Enums']['order_status'] | null
          id?: string
          note?: string | null
          order_id: string
          to_status: Database['public']['Enums']['order_status']
        }
        Update: {
          actor?: Database['public']['Enums']['event_actor']
          actor_id?: string | null
          created_at?: string
          from_status?: Database['public']['Enums']['order_status'] | null
          id?: string
          note?: string | null
          order_id?: string
          to_status?: Database['public']['Enums']['order_status']
        }
        Relationships: [
          {
            foreignKeyName: 'order_events_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
      orders: {
        Row: {
          admin_note: string | null
          amount_inr: number
          buyer_email: string
          buyer_name: string | null
          buyer_note: string | null
          buyer_whatsapp: string
          created_at: string
          delivered_at: string | null
          discount_inr: number
          expires_at: string
          gateway_provider: string | null
          gateway_ref: string | null
          id: string
          order_number: string
          paid_at: string | null
          product_id: string | null
          product_slug_snapshot: string | null
          product_title_snapshot: string
          status: Database['public']['Enums']['order_status']
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount_inr: number
          buyer_email: string
          buyer_name?: string | null
          buyer_note?: string | null
          buyer_whatsapp: string
          created_at?: string
          delivered_at?: string | null
          discount_inr?: number
          expires_at?: string
          gateway_provider?: string | null
          gateway_ref?: string | null
          id?: string
          order_number?: string
          paid_at?: string | null
          product_id?: string | null
          product_slug_snapshot?: string | null
          product_title_snapshot: string
          status?: Database['public']['Enums']['order_status']
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount_inr?: number
          buyer_email?: string
          buyer_name?: string | null
          buyer_note?: string | null
          buyer_whatsapp?: string
          created_at?: string
          delivered_at?: string | null
          discount_inr?: number
          expires_at?: string
          gateway_provider?: string | null
          gateway_ref?: string | null
          id?: string
          order_number?: string
          paid_at?: string | null
          product_id?: string | null
          product_slug_snapshot?: string | null
          product_title_snapshot?: string
          status?: Database['public']['Enums']['order_status']
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'orders_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      payment_attempts: {
        Row: {
          amount_inr: number | null
          created_at: string
          error_message: string | null
          gateway_provider: string
          gateway_ref: string | null
          id: string
          order_id: string
          raw_request: Json | null
          raw_response: Json | null
          status: Database['public']['Enums']['payment_status']
        }
        Insert: {
          amount_inr?: number | null
          created_at?: string
          error_message?: string | null
          gateway_provider: string
          gateway_ref?: string | null
          id?: string
          order_id: string
          raw_request?: Json | null
          raw_response?: Json | null
          status?: Database['public']['Enums']['payment_status']
        }
        Update: {
          amount_inr?: number | null
          created_at?: string
          error_message?: string | null
          gateway_provider?: string
          gateway_ref?: string | null
          id?: string
          order_id?: string
          raw_request?: Json | null
          raw_response?: Json | null
          status?: Database['public']['Enums']['payment_status']
        }
        Relationships: [
          {
            foreignKeyName: 'payment_attempts_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          compare_at_price: number | null
          cover_image_url: string | null
          created_at: string
          demo_url: string | null
          description: string | null
          features: string[]
          gallery_urls: string[]
          id: string
          is_active: boolean
          is_featured: boolean
          price_inr: number
          rating: number | null
          review_count: number
          sales_count: number
          short_description: string | null
          slug: string
          tech_stack: string[]
          title: string
          updated_at: string
          version: string | null
          view_count: number
        }
        Insert: {
          category_id?: string | null
          compare_at_price?: number | null
          cover_image_url?: string | null
          created_at?: string
          demo_url?: string | null
          description?: string | null
          features?: string[]
          gallery_urls?: string[]
          id?: string
          is_active?: boolean
          is_featured?: boolean
          price_inr: number
          rating?: number | null
          review_count?: number
          sales_count?: number
          short_description?: string | null
          slug: string
          tech_stack?: string[]
          title: string
          updated_at?: string
          version?: string | null
          view_count?: number
        }
        Update: {
          category_id?: string | null
          compare_at_price?: number | null
          cover_image_url?: string | null
          created_at?: string
          demo_url?: string | null
          description?: string | null
          features?: string[]
          gallery_urls?: string[]
          id?: string
          is_active?: boolean
          is_featured?: boolean
          price_inr?: number
          rating?: number | null
          review_count?: number
          sales_count?: number
          short_description?: string | null
          slug?: string
          tech_stack?: string[]
          title?: string
          updated_at?: string
          version?: string | null
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          role: Database['public']['Enums']['user_role']
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          role?: Database['public']['Enums']['user_role']
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: Database['public']['Enums']['user_role']
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          announcement_text: string | null
          hero_headline: string | null
          hero_subheadline: string | null
          id: string
          is_store_open: boolean
          singleton: boolean
          store_name: string
          support_email: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          announcement_text?: string | null
          hero_headline?: string | null
          hero_subheadline?: string | null
          id?: string
          is_store_open?: boolean
          singleton?: boolean
          store_name?: string
          support_email?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          announcement_text?: string | null
          hero_headline?: string | null
          hero_subheadline?: string | null
          id?: string
          is_store_open?: boolean
          singleton?: boolean
          store_name?: string
          support_email?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          error_message: string | null
          event_id: string
          event_type: string | null
          gateway_provider: string
          gateway_ref: string | null
          headers: Json | null
          id: string
          order_id: string | null
          processed_at: string | null
          raw_body: string
          received_at: string
          signature_ok: boolean | null
          state: Database['public']['Enums']['webhook_state']
        }
        Insert: {
          error_message?: string | null
          event_id: string
          event_type?: string | null
          gateway_provider: string
          gateway_ref?: string | null
          headers?: Json | null
          id?: string
          order_id?: string | null
          processed_at?: string | null
          raw_body: string
          received_at?: string
          signature_ok?: boolean | null
          state?: Database['public']['Enums']['webhook_state']
        }
        Update: {
          error_message?: string | null
          event_id?: string
          event_type?: string | null
          gateway_provider?: string
          gateway_ref?: string | null
          headers?: Json | null
          id?: string
          order_id?: string | null
          processed_at?: string | null
          raw_body?: string
          received_at?: string
          signature_ok?: boolean | null
          state?: Database['public']['Enums']['webhook_state']
        }
        Relationships: [
          {
            foreignKeyName: 'webhook_events_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      bump_product_view: { Args: { p_product_id: string }; Returns: undefined }
      is_admin: { Args: Record<string, never>; Returns: boolean }
      owns_order: { Args: { p_order_id: string }; Returns: boolean }
    }
    Enums: {
      event_actor: 'system' | 'webhook' | 'admin' | 'customer'
      order_status:
        | 'pending_payment'
        | 'paid'
        | 'delivered'
        | 'failed'
        | 'cancelled'
        | 'refunded'
      payment_status: 'created' | 'success' | 'failed'
      user_role: 'user' | 'admin'
      webhook_state: 'received' | 'processed' | 'ignored' | 'invalid' | 'error'
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update']
export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]

// ---------------------------------------------------------------------
// Domain aliases — what the rest of the app imports.
// ---------------------------------------------------------------------

export type Profile = Tables<'profiles'>
export type Category = Tables<'categories'>
export type Product = Tables<'products'>
export type Order = Tables<'orders'>
export type OrderEvent = Tables<'order_events'>
export type PaymentAttempt = Tables<'payment_attempts'>
export type StoreSettings = Tables<'store_settings'>

export type OrderStatus = Enums<'order_status'>
export type UserRole = Enums<'user_role'>
export type PaymentStatus = Enums<'payment_status'>
export type EventActor = Enums<'event_actor'>

/** A product row with its category joined in, as the catalogue queries select it. */
export type ProductWithCategory = Product & {
  categories: Pick<Category, 'id' | 'name' | 'slug'> | null
}
