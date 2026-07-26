import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill them in.',
  )
}

/**
 * The publishable/anon key ships to every visitor — that is by design.
 * It grants nothing on its own; Row Level Security decides what each
 * session can actually read. Never put the service role key here.
 */
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

export const siteUrl = import.meta.env.VITE_SITE_URL ?? window.location.origin

/** Absolute URL of a deployed Edge Function. */
export function functionUrl(name: string): string {
  return `${url.replace(/\/$/, '')}/functions/v1/${name}`
}
