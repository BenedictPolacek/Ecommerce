import { Link, useNavigate, useSearchParams } from 'react-router';
import { Pagination } from '@/components/Pagination';
import { PageStatus } from '@/components/layout/PageStatus';
import { Button } from '@/components/ui/button';
import { findCategoryBySlug } from '@/features/categories/api';
import { CategoryNav } from '@/features/categories/components/CategoryNav';
import { useCategoryTree } from '@/features/categories/hooks';
import { ProductGrid, ProductGridSkeleton } from '@/features/products/components/ProductGrid';
import { ProductSearch } from '@/features/products/components/ProductSearch';
import { useProducts } from '@/features/products/hooks';
import { parseShopParams, shopSearch } from '@/features/products/shop-params';

export const PAGE_SIZE = 12;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

export function ShopPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const params = parseShopParams(searchParams);

  // The URL has the readable slug, the API wants the category id
  const categories = useCategoryTree();
  const category = params.category
    ? findCategoryBySlug(categories.data ?? [], params.category)
    : null;
  const unknownCategory = !!params.category && categories.isSuccess && !category;
  // With a category in the URL, wait for the id instead of loading all products first
  const waitingForCategory = !!params.category && categories.isPending;

  const products = useProducts(
    { search: params.q, categoryId: category?.id, page: params.page, limit: PAGE_SIZE },
    { enabled: !waitingForCategory && !unknownCategory }
  );

  const title = category?.name ?? 'All products';
  const total = products.data?.pagination.total;

  return (
    <div className="grid gap-8 py-8 md:grid-cols-[12rem_1fr]">
      <aside>
        <CategoryNav
          activeSlug={params.category}
          hrefFor={(slug) => `/${shopSearch(params, { category: slug })}`}
        />
      </aside>

      <section aria-labelledby="shop-title" className="flex flex-col gap-6">
        <header className="flex flex-col gap-4">
          <div>
            <h1 id="shop-title" className="text-2xl font-bold">
              {title}
            </h1>
            {total !== undefined && (
              <p className="text-muted-foreground text-sm" aria-live="polite">
                {params.q
                  ? `${plural(total, 'result')} for "${params.q}"`
                  : plural(total, 'product')}
              </p>
            )}
          </div>
          <ProductSearch
            key={params.q}
            value={params.q}
            onSearch={(q) => navigate(`/${shopSearch(params, { q })}`)}
          />
        </header>

        {unknownCategory ? (
          <PageStatus title="Category not found">
            <Button asChild variant="outline">
              <Link to="/">Show all products</Link>
            </Button>
          </PageStatus>
        ) : products.isError ? (
          <PageStatus title="Products could not be loaded">
            <Button onClick={() => products.refetch()}>Try again</Button>
          </PageStatus>
        ) : !products.data ? (
          <ProductGridSkeleton count={PAGE_SIZE} />
        ) : products.data.products.length === 0 ? (
          <PageStatus title="No products found">
            {(params.q || params.category) && (
              <Button asChild variant="outline">
                <Link to="/">Clear filters</Link>
              </Button>
            )}
          </PageStatus>
        ) : (
          // Dimmed while the next page loads (the previous page stays visible)
          <div className={products.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
            <ProductGrid products={products.data.products} />
          </div>
        )}

        {products.data && (
          <Pagination
            page={params.page}
            totalPages={products.data.pagination.totalPages}
            hrefFor={(page) => `/${shopSearch(params, { page })}`}
          />
        )}
      </section>
    </div>
  );
}
