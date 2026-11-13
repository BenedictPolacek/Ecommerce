import { useEffect } from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { reportError } from '@/lib/sentry';
import { PageStatus } from '@/components/layout/PageStatus';
import { Button } from '@/components/ui/button';

/** Shown by the router when rendering a route throws (instead of a blank page) */
export function RouteErrorPage() {
  const error = useRouteError();
  // 404 and other route responses are expected; everything else is a bug in the app
  const isBug = !isRouteErrorResponse(error);

  useEffect(() => {
    if (!isBug) return;
    if (import.meta.env.DEV) console.error(error);
    reportError(error);
  }, [error, isBug]);

  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Something went wrong';

  return (
    <div className="container mx-auto px-4">
      <PageStatus title={title}>
        <p className="text-muted-foreground">Please try again or go back to the shop.</p>
        <div className="flex gap-2">
          <Button onClick={() => window.location.reload()}>Reload page</Button>
          <Button asChild variant="outline">
            <Link to="/">Back to the shop</Link>
          </Button>
        </div>
      </PageStatus>
    </div>
  );
}
