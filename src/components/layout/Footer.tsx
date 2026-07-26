import { Link } from 'react-router-dom'
import { Mail, MessageCircle } from 'lucide-react'
import { useStoreSettings } from '@/features/catalog/queries'

export function Footer() {
  const { data: settings } = useStoreSettings()
  const year = new Date().getFullYear()

  return (
    <footer className="mt-20 px-3 pb-6 sm:px-4">
      <div className="glass mx-auto max-w-6xl p-6 sm:p-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="brand-gradient grid size-9 place-items-center rounded-xl font-display font-bold text-white">
                U
              </span>
              <span className="font-display text-base font-semibold">
                {settings?.store_name ?? 'UX Store'}
              </span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--text-muted)]">
              Production-ready scripts and source code. Every order is delivered personally over
              WhatsApp or email — no automated download links, no broken archives.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Store</h4>
            <ul className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
              <li>
                <Link to="/products" className="hover:text-[var(--text-primary)]">
                  All products
                </Link>
              </li>
              <li>
                <Link to="/account/orders" className="hover:text-[var(--text-primary)]">
                  Track your order
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[var(--text-primary)]">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Legal</h4>
            <ul className="mt-3 space-y-2 text-sm text-[var(--text-muted)]">
              <li>
                <Link to="/terms" className="hover:text-[var(--text-primary)]">
                  Terms of service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-[var(--text-primary)]">
                  Privacy policy
                </Link>
              </li>
              <li>
                <Link to="/refund-policy" className="hover:text-[var(--text-primary)]">
                  Refund policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-4 border-t border-[var(--glass-edge-lo)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--text-muted)]">
            © {year} {settings?.store_name ?? 'UX Store'}. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-4 text-xs">
            {settings?.whatsapp_number && (
              <a
                href={`https://wa.me/${settings.whatsapp_number}`}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <MessageCircle className="size-3.5" aria-hidden />
                WhatsApp
              </a>
            )}
            {settings?.support_email && (
              <a
                href={`mailto:${settings.support_email}`}
                className="flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <Mail className="size-3.5" aria-hidden />
                {settings.support_email}
              </a>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
}
