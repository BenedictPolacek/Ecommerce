import { Navigate, type RouteObject } from 'react-router';
import { PageLoading } from '@/components/layout/PageStatus';
import { RootLayout } from '@/components/layout/RootLayout';
import { GuestOnly } from '@/features/auth/components/GuestOnly';
import { RequireAuth } from '@/features/auth/components/RequireAuth';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { RouteErrorPage } from '@/pages/RouteErrorPage';
import { ShopPage } from '@/pages/ShopPage';

// Code splitting: every page except the shop (the landing page) is its own JS file that is
// only downloaded when the route is visited. import() tells the bundler where to split.
// React Router loads it before rendering, so the previous page stays visible meanwhile.

// Kept separate from the browser router so tests can mount the same routes in a memory router
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    // Shown on the very first load while a lazy page (e.g. a direct link to /cart) loads
    hydrateFallbackElement: <PageLoading />,
    children: [
      { index: true, element: <ShopPage /> },
      {
        path: 'products/:slug',
        lazy: () => import('@/pages/ProductPage').then((m) => ({ Component: m.ProductPage })),
      },
      {
        element: <GuestOnly />,
        children: [
          {
            path: 'login',
            lazy: () => import('@/pages/LoginPage').then((m) => ({ Component: m.LoginPage })),
          },
          {
            path: 'register',
            lazy: () => import('@/pages/RegisterPage').then((m) => ({ Component: m.RegisterPage })),
          },
          {
            path: 'forgot-password',
            lazy: () =>
              import('@/pages/ForgotPasswordPage').then((m) => ({
                Component: m.ForgotPasswordPage,
              })),
          },
        ],
      },
      // Email links work for visitors and logged-in users (the link may open on another device)
      {
        path: 'verify-email',
        lazy: () =>
          import('@/pages/VerifyEmailPage').then((m) => ({ Component: m.VerifyEmailPage })),
      },
      {
        path: 'reset-password',
        lazy: () =>
          import('@/pages/ResetPasswordPage').then((m) => ({ Component: m.ResetPasswordPage })),
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: 'account',
            lazy: () =>
              import('@/pages/account/AccountLayout').then((m) => ({ Component: m.AccountLayout })),
            children: [
              {
                index: true,
                lazy: () =>
                  import('@/pages/account/ProfilePage').then((m) => ({ Component: m.ProfilePage })),
              },
              {
                path: 'addresses',
                lazy: () =>
                  import('@/pages/account/AddressesPage').then((m) => ({
                    Component: m.AddressesPage,
                  })),
              },
              {
                path: 'security',
                lazy: () =>
                  import('@/pages/account/SecurityPage').then((m) => ({
                    Component: m.SecurityPage,
                  })),
              },
            ],
          },
          {
            path: 'cart',
            lazy: () => import('@/pages/CartPage').then((m) => ({ Component: m.CartPage })),
          },
          {
            path: 'orders',
            lazy: () => import('@/pages/OrdersPage').then((m) => ({ Component: m.OrdersPage })),
          },
          {
            path: 'orders/:orderNumber',
            lazy: () =>
              import('@/pages/OrderDetailPage').then((m) => ({ Component: m.OrderDetailPage })),
          },
          {
            path: 'checkout',
            lazy: () => import('@/pages/CheckoutPage').then((m) => ({ Component: m.CheckoutPage })),
          },
          {
            path: 'checkout/confirmation/:orderNumber',
            lazy: () =>
              import('@/pages/OrderConfirmationPage').then((m) => ({
                Component: m.OrderConfirmationPage,
              })),
          },
        ],
      },
      {
        element: <RequireAuth role="admin" />,
        children: [
          {
            path: 'admin',
            lazy: () =>
              import('@/pages/admin/AdminLayout').then((m) => ({ Component: m.AdminLayout })),
            children: [
              // Orders are the daily work: the admin area starts there
              { index: true, element: <Navigate to="orders" replace /> },
              {
                path: 'orders',
                lazy: () =>
                  import('@/pages/admin/AdminOrdersPage').then((m) => ({
                    Component: m.AdminOrdersPage,
                  })),
              },
              {
                path: 'orders/:orderNumber',
                lazy: () =>
                  import('@/pages/admin/AdminOrderDetailPage').then((m) => ({
                    Component: m.AdminOrderDetailPage,
                  })),
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
