import { Navigate, Outlet, useSearchParams } from 'react-router';
import { PageLoading } from '@/components/layout/PageStatus';
import { safeRedirect } from '@/lib/safe-redirect';
import { useCurrentUser } from '../hooks';

/**
 * Layout route for pages only visitors need (login, register).
 * Logged-in users go to ?redirect= (if it is a safe in-app path) or the home page.
 * This also performs the redirect right after a successful login.
 */
export function GuestOnly() {
  const { data: user, isPending } = useCurrentUser();
  const [searchParams] = useSearchParams();

  if (isPending) return <PageLoading />;

  if (user) return <Navigate to={safeRedirect(searchParams.get('redirect'))} replace />;

  return <Outlet />;
}
