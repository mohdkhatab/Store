import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/AuthProvider'
import { LoadingScreen } from '@/components/ui/Feedback'
import { NotFoundPage } from '@/routes/pages/NotFoundPage'

export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  // Critical: while the session rehydrates on a hard refresh, render a
  // loader rather than redirecting — otherwise refreshing /account/orders
  // bounces the user to the login page every time.
  if (status === 'loading') return <LoadingScreen label="Checking your session" />

  if (status === 'unauthenticated') {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  return <Outlet />
}

export function RequireAdmin() {
  const { status, profile, isAdmin } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <LoadingScreen label="Checking your session" />

  if (status === 'unauthenticated') {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  // Profile carries the role; wait for it rather than flashing a 404.
  if (!profile) return <LoadingScreen label="Checking permissions" />

  // 404 rather than 403: a non-admin should not learn that /admin exists.
  if (!isAdmin) return <NotFoundPage />

  return <Outlet />
}

export function RedirectIfAuthed() {
  const { status } = useAuth()
  if (status === 'loading') return <LoadingScreen />
  if (status === 'authenticated') return <Navigate to="/account/orders" replace />
  return <Outlet />
}
