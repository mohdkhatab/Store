import { toNumber } from './utils'

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

const inrPrecise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
})

export function formatPrice(value: number | string | null | undefined): string {
  return inr.format(toNumber(value))
}

export function formatPricePrecise(value: number | string | null | undefined): string {
  return inrPrecise.format(toNumber(value))
}

const dateFmt = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
})

const dateTimeFmt = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
  timeZone: 'Asia/Kolkata',
})

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return dateFmt.format(new Date(iso))
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return dateTimeFmt.format(new Date(iso))
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const mins = Math.round(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(iso)
}

export function discountPercent(
  price: number | string,
  compareAt: number | string | null | undefined,
): number | null {
  const p = toNumber(price)
  const c = toNumber(compareAt)
  if (!c || c <= p) return null
  return Math.round(((c - p) / c) * 100)
}
