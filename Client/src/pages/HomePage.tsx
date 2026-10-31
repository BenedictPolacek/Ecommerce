import { PageStatus } from '@/components/layout/PageStatus';

export function HomePage() {
  return (
    <PageStatus title="Welcome to the Ecommerce Shop">
      <p className="text-muted-foreground">Products are coming soon.</p>
    </PageStatus>
  );
}
