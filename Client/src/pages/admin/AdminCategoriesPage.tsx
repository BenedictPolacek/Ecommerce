import { Plus } from 'lucide-react';
import { PageStatus } from '@/components/layout/PageStatus';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryDialog } from '@/features/admin-categories/components/CategoryDialog';
import { CategoryTree } from '@/features/admin-categories/components/CategoryTree';
import { useCategoryTree } from '@/features/categories/hooks';

export function AdminCategoriesPage() {
  const { data: tree, isPending, isError, refetch } = useCategoryTree();

  return (
    <section aria-labelledby="admin-categories-title" className="flex max-w-3xl flex-col gap-6">
      <title>Categories | Admin | Ecommerce Shop</title>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="admin-categories-title" className="text-lg font-semibold">
          Categories
        </h2>
        {tree && (
          <CategoryDialog
            tree={tree}
            trigger={
              <Button size="sm">
                <Plus />
                New category
              </Button>
            }
          />
        )}
      </div>

      {isPending ? (
        <div role="status" aria-label="Loading categories" className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : isError ? (
        <PageStatus title="Categories could not be loaded">
          <Button onClick={() => refetch()}>Try again</Button>
        </PageStatus>
      ) : tree.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No categories yet. Products without a category are still shown in the shop.
        </p>
      ) : (
        <CategoryTree tree={tree} />
      )}
    </section>
  );
}
