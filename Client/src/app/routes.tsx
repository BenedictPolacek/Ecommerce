import type { RouteObject } from 'react-router';
import { RootLayout } from '@/components/layout/RootLayout';
import { RequireAuth } from '@/features/auth/components/RequireAuth';
import { AccountPage } from '@/pages/AccountPage';
import { AdminPage } from '@/pages/AdminPage';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { RouteErrorPage } from '@/pages/RouteErrorPage';

// Kept separate from the browser router so tests can mount the same routes in a memory router
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'login', element: <LoginPage /> },
      {
        element: <RequireAuth />,
        children: [{ path: 'account', element: <AccountPage /> }],
      },
      {
        element: <RequireAuth role="admin" />,
        children: [{ path: 'admin', element: <AdminPage /> }],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
