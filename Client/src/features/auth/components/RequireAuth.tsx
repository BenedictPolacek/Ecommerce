import { Link, Navigate, Outlet, useLocation } from 'react-router';
import { PageLoading, PageStatus } from '@/components/layout/PageStatus';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '../hooks';
import type { UserRole } from '../types';

interface RequireAuthProps {
  /** Only users with this role may enter (e.g. 'admin') */
  role?: UserRole;
}

/**
 * Layout route that only renders its child routes for logged-in users.
 * Visitors are sent to the login page and come back afterwards (?redirect=).
 * This is only UX: the API checks every request again, so it is not a security boundary.
 */
export function RequireAuth({ role }: RequireAuthProps) {
  const { data: user, isPending, isError, refetch } = useCurrentUser();
  const location = useLocation();

  if (isPending) return <PageLoading />;

  if (isError) {
    return (
      <PageStatus title="Something went wrong">
        <Button onClick={() => refetch()}>Try again</Button>
      </PageStatus>
    );
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (role && user.role !== role) {
    return (
      <PageStatus title="Access denied">
        <p className="text-muted-foreground">You do not have permission to view this page.</p>
        <Button asChild variant="outline">
          <Link to="/">Back to the shop</Link>
        </Button>
      </PageStatus>
    );
  }

  return <Outlet />;
}
