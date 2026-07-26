import type { Order } from '@/types/database'
import { formatPrice } from './format'

/**
 * Pre-filled delivery links for the admin fulfilment screen. This is the
 * owner's entire daily workflow: open order → tap WhatsApp → send file →
 * mark delivered.
 *
 * wa.me needs E.164 with no '+' and no separators; the DB CHECK constraint
 * on buyer_whatsapp guarantees the stored value is already in that shape.
 */
export function whatsappDeliveryLink(order: Order, storeName = 'UX Store'): string {
  const message = [
    `Hi ${order.buyer_name ?? 'there'}, this is ${storeName}.`,
    '',
    `Your order ${order.order_number} is confirmed.`,
    `Product: ${order.product_title_snapshot}`,
    `Amount paid: ${formatPrice(order.amount_inr)}`,
    '',
    'Sending your files now. Please confirm once you receive them.',
  ].join('\n')

  return `https://wa.me/${order.buyer_whatsapp}?text=${encodeURIComponent(message)}`
}

export function emailDeliveryLink(order: Order, storeName = 'UX Store'): string {
  const subject = `Your ${storeName} order ${order.order_number} — ${order.product_title_snapshot}`
  const body = [
    `Hi ${order.buyer_name ?? 'there'},`,
    '',
    `Thanks for your purchase. Your order ${order.order_number} is confirmed.`,
    '',
    `Product: ${order.product_title_snapshot}`,
    `Amount paid: ${formatPrice(order.amount_inr)}`,
    '',
    'Your files are attached to this email.',
    '',
    'If anything is missing, just reply here and I will sort it out.',
    '',
    storeName,
  ].join('\n')

  return `mailto:${order.buyer_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/** Buyer-facing "I need help with this order" link. */
export function supportWhatsappLink(storeWhatsapp: string, orderNumber?: string): string {
  const message = orderNumber
    ? `Hi, I need help with my order ${orderNumber}.`
    : 'Hi, I have a question about a product.'
  return `https://wa.me/${storeWhatsapp}?text=${encodeURIComponent(message)}`
}
