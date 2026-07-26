import { NavLink, Outlet, ScrollRestoration } from 'react-router-dom'
import {
  FolderTree,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Store,
} from 'lucide-react'
import { Navbar } from '@/components/layout/Navbar'
import { cn } from '@/lib/utils'
import { useAdminStats } from '@/features/admin/queries'

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, end: false },
  { to: '/admin/products', label: 'Products', icon: Package, end: false },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree, end: false },
  { to: '/admin/settings', label: 'Settings', icon: Settings, end: false },
]

export function AdminLayout() {
  const { data: stats } = useAdminStats()

  return (
    <div className="flex min-h-dvh flex-col">
      <Navbar />

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-3 py-6 sm:px-4">
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="glass sticky top-24 space-y-1 p-2">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'brand-gradient text-white'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--glass-fill-lo)] hover:text-[var(--text-primary)]',
                  )
                }
              >
                <l.icon className="size-4" aria-hidden />
                <span className="flex-1">{l.label}</span>
                {l.label === 'Orders' && stats && stats.readyToDeliver > 0 && (
                  <span className="tnum rounded-full bg-[var(--warning)] px-1.5 py-0.5 text-[10px] font-bold text-black">
                    {stats.readyToDeliver}
                  </span>
                )}
              </NavLink>
            ))}

            <a
              href="/"
              className="mt-2 flex items-center gap-2.5 rounded-xl border-t border-[var(--glass-edge-lo)] px-3 py-2.5 pt-4 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <Store className="size-4" aria-hidden />
              View storefront
            </a>
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          {/* Horizontal nav on small screens — a sidebar would eat the viewport. */}
          <nav className="glass mb-5 flex gap-1 overflow-x-auto p-1.5 lg:hidden">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium',
                    isActive
                      ? 'brand-gradient text-white'
                      : 'text-[var(--text-secondary)]',
                  )
                }
              >
                <l.icon className="size-4" aria-hidden />
                {l.label}
              </NavLink>
            ))}
          </nav>

          <Outlet />
        </main>
      </div>

      <ScrollRestoration />
    </div>
  )
}
