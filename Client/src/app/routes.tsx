import type { RouteObject } from 'react-router';
import { RootLayout } from '@/components/layout/RootLayout';
import { GuestOnly } from '@/features/auth/components/GuestOnly';
import { RequireAuth } from '@/features/auth/components/RequireAuth';
import { AccountPage } from '@/pages/AccountPage';
import { CartPage } from '@/pages/CartPage';
import { AdminPage } from '@/pages/AdminPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProductPage } from '@/pages/ProductPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { RouteErrorPage } from '@/pages/RouteErrorPage';
import { ShopPage } from '@/pages/ShopPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';

// Kept separate from the browser router so tests can mount the same routes in a memory router
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <ShopPage /> },
      { path: 'products/:slug', element: <ProductPage /> },
      {
        element: <GuestOnly />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
          { path: 'forgot-password', element: <ForgotPasswordPage /> },
        ],
      },
      // Email links work for visitors and logged-in users (the link may open on another device)
      { path: 'verify-email', element: <VerifyEmailPage /> },
      { path: 'reset-password', element: <ResetPasswordPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: 'account', element: <AccountPage /> },
          { path: 'cart', element: <CartPage /> },
        ],
      },
      {
        element: <RequireAuth role="admin" />,
        children: [{ path: 'admin', element: <AdminPage /> }],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
