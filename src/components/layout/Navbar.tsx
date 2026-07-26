import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LogOut, Menu, Moon, Package, Sun, User as UserIcon, X } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { useTheme } from '@/components/theme/ThemeProvider'
import { useStoreSettings } from '@/features/catalog/queries'
import { Button, LinkButton } from '@/components/ui/Button'
import { cn, initialsFrom } from '@/lib/utils'

const navLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/products', label: 'Products', end: false },
  { to: '/contact', label: 'Contact', end: false },
]

export function Navbar() {
  const { status, profile, isAdmin, signOut, user } = useAuth()
  const { resolved, setTheme } = useTheme()
  const { data: settings } = useStoreSettings()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  // Close both menus whenever the route changes.
  useEffect(() => {
    const close = () => {
      setMobileOpen(false)
      setMenuOpen(false)
    }
    window.addEventListener('popstate', close)
    return () => window.removeEventListener('popstate', close)
  }, [])

  async function handleSignOut() {
    await signOut()
    setMenuOpen(false)
    setMobileOpen(false)
    navigate('/')
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
      isActive
        ? 'text-[var(--text-primary)] bg-[var(--glass-fill-lo)]'
        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
    )

  return (
    <>
      {settings?.announcement_text && (
        <div className="brand-gradient px-4 py-2 text-center text-xs font-medium text-white">
          {settings.announcement_text}
        </div>
      )}

      <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
        <nav className="glass glass-hi mx-auto flex h-16 max-w-6xl items-center gap-2 px-3 sm:px-4">
          <Link to="/" className="flex items-center gap-2.5 pr-2">
            <span className="brand-gradient grid size-9 shrink-0 place-items-center rounded-xl font-display text-base font-bold text-white">
              U
            </span>
            <span className="font-display text-base font-semibold tracking-tight">
              {settings?.store_name ?? 'UX Store'}
            </span>
          </Link>

          <div className="ml-2 hidden items-center gap-1 md:flex">
            {navLinks.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
              aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} theme`}
              className="grid size-9 place-items-center rounded-xl text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] neu-raised"
            >
              {resolved === 'dark' ? (
                <Sun className="size-4" aria-hidden />
              ) : (
                <Moon className="size-4" aria-hidden />
              )}
            </button>

            {status === 'authenticated' ? (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="brand-gradient grid size-9 place-items-center rounded-xl text-xs font-semibold text-white"
                >
                  {initialsFrom(profile?.full_name ?? user?.email)}
                </button>

                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <div
                      role="menu"
                      className="glass glass-hi absolute right-0 z-20 mt-2 w-56 overflow-hidden p-1.5"
                    >
                      <div className="border-b border-[var(--glass-edge-lo)] px-3 py-2">
                        <p className="truncate text-sm font-medium">
                          {profile?.full_name ?? 'Account'}
                        </p>
                        <p className="truncate text-xs text-[var(--text-muted)]">{user?.email}</p>
                      </div>
                      <MenuItem to="/account/orders" icon={Package} onClick={() => setMenuOpen(false)}>
                        My orders
                      </MenuItem>
                      <MenuItem to="/account/profile" icon={UserIcon} onClick={() => setMenuOpen(false)}>
                        Profile
                      </MenuItem>
                      {isAdmin && (
                        <MenuItem to="/admin" icon={LayoutDashboard} onClick={() => setMenuOpen(false)}>
                          Admin panel
                        </MenuItem>
                      )}
                      <button
                        role="menuitem"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--danger)] transition-colors hover:bg-[var(--glass-fill-lo)]"
                      >
                        <LogOut className="size-4" aria-hidden />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <LinkButton to="/login" variant="ghost" size="sm">
                  Sign in
                </LinkButton>
                <LinkButton to="/signup" size="sm">
                  Get started
                </LinkButton>
              </div>
            )}

            <button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
              className="grid size-9 place-items-center rounded-xl text-[var(--text-secondary)] md:hidden neu-raised"
            >
              {mobileOpen ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
            </button>
          </div>
        </nav>

        {mobileOpen && (
          <div className="glass glass-hi mx-auto mt-2 max-w-6xl space-y-1 p-3 md:hidden">
            {navLinks.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'block rounded-lg px-3 py-2.5 text-sm font-medium',
                    isActive
                      ? 'bg-[var(--glass-fill-lo)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)]',
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
            {status !== 'authenticated' && (
              <div className="flex gap-2 pt-2">
                <LinkButton to="/login" variant="glass" size="sm" fullWidth onClick={() => setMobileOpen(false)}>
                  Sign in
                </LinkButton>
                <LinkButton to="/signup" size="sm" fullWidth onClick={() => setMobileOpen(false)}>
                  Get started
                </LinkButton>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  )
}

function MenuItem({
  to,
  icon: Icon,
  children,
  onClick,
}: {
  to: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Link
      role="menuitem"
      to={to}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-fill-lo)] hover:text-[var(--text-primary)]"
    >
      <Icon className="size-4" aria-hidden />
      {children}
    </Link>
  )
}

export { Button }
