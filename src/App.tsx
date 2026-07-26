import { lazy, Suspense } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { RequireAdmin, RequireAuth, RedirectIfAuthed } from '@/routes/guards/Guards'
import { LoadingScreen } from '@/components/ui/Feedback'
import { HomePage } from '@/routes/pages/HomePage'
import { ProductsPage } from '@/routes/pages/ProductsPage'
import { ProductDetailPage } from '@/routes/pages/ProductDetailPage'
import { CheckoutPage } from '@/routes/pages/CheckoutPage'
import { PaymentReturnPage } from '@/routes/pages/PaymentReturnPage'
import { MockPaymentPage } from '@/routes/pages/MockPaymentPage'
import { NotFoundPage } from '@/routes/pages/NotFoundPage'
import {
  ContactPage,
  PrivacyPage,
  RefundPolicyPage,
  TermsPage,
} from '@/routes/pages/StaticPages'
import {
  AuthCallbackPage,
  ForgotPasswordPage,
  LoginPage,
  ResetPasswordPage,
  SignupPage,
} from '@/routes/pages/auth/AuthPages'
import {
  MyOrdersPage,
  OrderDetailPage,
  ProfilePage,
} from '@/routes/pages/account/AccountPages'

// The admin bundle is never shipped to a buyer who does not open /admin.
const AdminLayout = lazy(() =>
  import('@/routes/pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })),
)
const AdminDashboard = lazy(() =>
  import('@/routes/pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })),
)
const AdminOrders = lazy(() =>
  import('@/routes/pages/admin/AdminOrders').then((m) => ({ default: m.AdminOrders })),
)
const AdminProducts = lazy(() =>
  import('@/routes/pages/admin/AdminProducts').then((m) => ({ default: m.AdminProducts })),
)
const AdminProductEditor = lazy(() =>
  import('@/routes/pages/admin/AdminProducts').then((m) => ({ default: m.AdminProductEditor })),
)
const AdminCategories = lazy(() =>
  import('@/routes/pages/admin/AdminSettingsPages').then((m) => ({ default: m.AdminCategories })),
)
const AdminSettings = lazy(() =>
  import('@/routes/pages/admin/AdminSettingsPages').then((m) => ({ default: m.AdminSettings })),
)

function lazyRoute(node: React.ReactNode) {
  return <Suspense fallback={<LoadingScreen />}>{node}</Suspense>
}

const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/products', element: <ProductsPage /> },
      { path: '/products/:slug', element: <ProductDetailPage /> },
      { path: '/contact', element: <ContactPage /> },
      { path: '/terms', element: <TermsPage /> },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/refund-policy', element: <RefundPolicyPage /> },

      // Signed-out users get bounced to login and returned here afterwards.
      {
        element: <RedirectIfAuthed />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/signup', element: <SignupPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
        ],
      },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/auth/reset-password', element: <ResetPasswordPage /> },
      { path: '/auth/callback', element: <AuthCallbackPage /> },

      {
        element: <RequireAuth />,
        children: [
          { path: '/checkout/:slug', element: <CheckoutPage /> },
          { path: '/checkout/return', element: <PaymentReturnPage /> },
          { path: '/checkout/mock', element: <MockPaymentPage /> },
          { path: '/account', element: <MyOrdersPage /> },
          { path: '/account/orders', element: <MyOrdersPage /> },
          { path: '/account/orders/:orderId', element: <OrderDetailPage /> },
          { path: '/account/profile', element: <ProfilePage /> },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: <RequireAdmin />,
    children: [
      {
        path: '/admin',
        element: lazyRoute(<AdminLayout />),
        children: [
          { index: true, element: lazyRoute(<AdminDashboard />) },
          { path: 'orders', element: lazyRoute(<AdminOrders />) },
          { path: 'products', element: lazyRoute(<AdminProducts />) },
          { path: 'products/:productId', element: lazyRoute(<AdminProductEditor />) },
          { path: 'categories', element: lazyRoute(<AdminCategories />) },
          { path: 'settings', element: lazyRoute(<AdminSettings />) },
        ],
      },
    ],
  },
])

export function App() {
  return <RouterProvider router={router} />
}
