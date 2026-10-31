import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { PageStatus } from '@/components/layout/PageStatus';
import { Button } from '@/components/ui/button';

/** Shown by the router when rendering a route throws (instead of a blank page) */
export function RouteErrorPage() {
  const error = useRouteError();

  if (import.meta.env.DEV) console.error(error);

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
