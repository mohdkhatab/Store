import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Postgres `numeric` can arrive as a string over PostgREST depending on
 * value and client version. Every price goes through here so a stray
 * string never turns a total into "2999.003999".
 */
export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * wa.me requires E.164 with no '+' and no separators. A number stored as
 * "+91 98765 43210" produces a dead link, and the delivery link is the
 * one thing in this app that absolutely must work.
 */
export function normalizeWhatsApp(input: string, defaultCountryCode = '91'): string {
  const digits = input.replace(/\D/g, '')
  if (!digits) return ''
  // A bare Indian mobile number is 10 digits; prefix the country code.
  if (digits.length === 10) return `${defaultCountryCode}${digits}`
  // Strip a leading 0 from "091..." / "0987..." style input.
  return digits.replace(/^0+/, '')
}

export function isValidWhatsApp(value: string): boolean {
  return /^[1-9][0-9]{7,14}$/.test(value)
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}

/** Deterministic gradient per slug, so products without art still look intentional. */
export function gradientFor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  const hue2 = (hue + 55) % 360
  return `linear-gradient(135deg, hsl(${hue} 72% 58%) 0%, hsl(${hue2} 76% 46%) 100%)`
}

export function initialsFrom(name: string | null | undefined, fallback = 'U'): string {
  if (!name) return fallback
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || fallback
}
