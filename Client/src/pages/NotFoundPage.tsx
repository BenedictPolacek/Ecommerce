import { Link } from 'react-router';
import { PageStatus } from '@/components/layout/PageStatus';
import { Button } from '@/components/ui/button';

export function NotFoundPage() {
  return (
    <PageStatus title="Page not found">
      <p className="text-muted-foreground">The page you are looking for does not exist.</p>
      <Button asChild variant="outline">
        <Link to="/">Back to the shop</Link>
      </Button>
    </PageStatus>
  );
}
