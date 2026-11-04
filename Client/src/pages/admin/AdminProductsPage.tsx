import { ImageOff, Plus, Search } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Pagination } from '@/components/Pagination';
import { PageStatus } from '@/components/layout/PageStatus';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminProducts } from '@/features/admin-products/hooks';
import { categoryOptionLabel, flattenCategoryTree } from '@/features/categories/api';
import { useCategoryTree } from '@/features/categories/hooks';
import { formatPrice } from '@/lib/format';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;

interface Filters {
  search?: string;
  categoryId?: string;
  /** Default: active products */
  inactive?: boolean;
  page?: number;
}

/** ?search=lamp&category=<id>&status=inactive&page=2 (a new filter starts on page 1) */
function adminProductsHref({ search, categoryId, inactive, page }: Filters) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (categoryId) params.set('category', categoryId);
  if (inactive) params.set('status', 'inactive');
  if (page && page > 1) params.set('page', String(page));
  const query = params.toString();
  return `/admin/products${query ? `?${query}` : ''}`;
}

export function AdminProductsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const search = searchParams.get('search')?.trim() || undefined;
  const categoryId = searchParams.get('category') || undefined;
  const inactive = searchParams.get('status') === 'inactive';
  const pageParam = Number(searchParams.get('page'));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const filters = { search, categoryId, inactive };

  const { data: categories = [] } = useCategoryTree();
  const { data, isError, isPlaceholderData, refetch } = useAdminProducts({
    search,
    categoryId,
    active: !inactive,
    page,
    limit: PAGE_SIZE,
  });

  return (
    <section aria-labelledby="admin-products-title" className="flex flex-col gap-6">
      <title>Products | Admin | Ecommerce Shop</title>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="admin-products-title" className="text-lg font-semibold">
          Products
        </h2>
        <Button asChild size="sm">
          <Link to="/admin/products/new">
            <Plus />
            New product
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <form
          role="search"
          className="flex flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const value = String(new FormData(event.currentTarget).get('search') ?? '').trim();
            navigate(adminProductsHref({ ...filters, search: value }));
          }}
        >
          <Input
            key={search ?? ''}
            name="search"
            type="search"
            defaultValue={search}
            aria-label="Search products"
            placeholder="Name or description"
            className="max-w-sm"
          />
          <Button type="submit" variant="outline">
            <Search />
            Search
          </Button>
        </form>
        <label className="flex items-center gap-2 text-sm">
          Category
          <select
            value={categoryId ?? ''}
            onChange={(event) =>
              navigate(adminProductsHref({ ...filters, categoryId: event.target.value }))
            }
            className="border-input h-9 rounded-md border bg-transparent px-3 shadow-xs"
          >
            <option value="">All categories</option>
            {flattenCategoryTree(categories).map((option) => (
              <option key={option.id} value={option.id}>
                {categoryOptionLabel(option)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Visibility
          <select
            value={inactive ? 'inactive' : 'active'}
            onChange={(event) =>
              navigate(
                adminProductsHref({ ...filters, inactive: event.target.value === 'inactive' })
              )
            }
            className="border-input h-9 rounded-md border bg-transparent px-3 shadow-xs"
          >
            <option value="active">Visible in the shop</option>
            <option value="inactive">Hidden</option>
          </select>
        </label>
      </div>

      {isError ? (
        <PageStatus title="Products could not be loaded">
          <Button onClick={() => refetch()}>Try again</Button>
        </PageStatus>
      ) : !data ? (
        <div role="status" aria-label="Loading products" className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : data.products.length === 0 ? (
        <PageStatus title={inactive ? 'No hidden products' : 'No products found'}>
          {(search || categoryId) && (
            <Button asChild variant="outline">
              <Link to={adminProductsHref({ inactive })}>Reset filters</Link>
            </Button>
          )}
        </PageStatus>
      ) : (
        <Table className={isPlaceholderData ? 'opacity-60' : undefined}>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">
                <span className="sr-only">Image</span>
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  {product.primary_image ? (
                    <img
                      src={product.primary_image.url}
                      // Decorative: the name is in the next column
                      alt=""
                      className="size-10 rounded object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded">
                      <ImageOff className="size-4" aria-hidden />
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    to={`/admin/products/${product.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {product.name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{product.sku ?? '–'}</TableCell>
                <TableCell>{product.category_name ?? '–'}</TableCell>
                <TableCell className="text-right">{formatPrice(product.price_cents)}</TableCell>
                <TableCell
                  className={cn(
                    'text-right',
                    product.stock_quantity === 0 && 'text-destructive font-medium'
                  )}
                >
                  {product.stock_quantity}
                </TableCell>
                <TableCell>
                  <Badge variant={product.is_active ? 'secondary' : 'outline'}>
                    {product.is_active ? 'Visible' : 'Hidden'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && (
        <Pagination
          page={page}
          totalPages={data.pagination.totalPages}
          hrefFor={(target) => adminProductsHref({ ...filters, page: target })}
        />
      )}
    </section>
  );
}
