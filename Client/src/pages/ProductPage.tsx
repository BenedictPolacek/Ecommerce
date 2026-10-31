import { Link, useParams } from 'react-router';
import { PageStatus } from '@/components/layout/PageStatus';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AddToCartForm } from '@/features/cart/components/AddToCartForm';
import { findCategoryById } from '@/features/categories/api';
import { useCategoryTree } from '@/features/categories/hooks';
import { ProductGallery } from '@/features/products/components/ProductGallery';
import { StockStatus } from '@/features/products/components/StockStatus';
import { useProduct } from '@/features/products/hooks';
import { ApiError } from '@/lib/api-client';
import { formatPrice } from '@/lib/format';

export function ProductPage() {
  const { slug = '' } = useParams();
  const { data: product, isPending, isError, error, refetch } = useProduct(slug);
  const categories = useCategoryTree();

  if (isPending) return <ProductPageSkeleton />;

  if (isError) {
    // 404: wrong slug, or the product was deactivated (hidden for customers)
    if (error instanceof ApiError && error.status === 404) {
      return (
        <PageStatus title="Product not found">
          <p className="text-muted-foreground">This product does not exist or is no longer sold.</p>
          <Button asChild variant="outline">
            <Link to="/">Back to the shop</Link>
          </Button>
        </PageStatus>
      );
    }

    return (
      <PageStatus title="Product could not be loaded">
        <Button onClick={() => refetch()}>Try again</Button>
      </PageStatus>
    );
  }

  const category = product.category_id
    ? findCategoryById(categories.data ?? [], product.category_id)
    : null;

  return (
    <div className="flex flex-col gap-6 py-8">
      {/* React 19 moves <title> into <head>: each product gets its own browser tab title */}
      <title>{`${product.name} | Ecommerce Shop`}</title>

      <nav aria-label="Breadcrumb">
        <ol className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          <li>
            <Link to="/" className="hover:text-foreground">
              Shop
            </Link>
          </li>
          {category && (
            <li className="flex items-center gap-2">
              <span aria-hidden>/</span>
              <Link to={`/?category=${category.slug}`} className="hover:text-foreground">
                {category.name}
              </Link>
            </li>
          )}
          <li className="flex items-center gap-2">
            <span aria-hidden>/</span>
            <span aria-current="page" className="text-foreground">
              {product.name}
            </span>
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />

        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-2xl font-semibold">{formatPrice(product.price_cents)}</p>
          <p className="text-muted-foreground text-xs">Incl. VAT, plus shipping</p>
          <StockStatus stock={product.stock_quantity} />
          <AddToCartForm
            productId={product.id}
            productName={product.name}
            stock={product.stock_quantity}
          />
          {product.description && (
            <section aria-labelledby="description-title" className="mt-4 border-t pt-4">
              <h2 id="description-title" className="mb-2 font-semibold">
                Description
              </h2>
              <p className="text-muted-foreground whitespace-pre-line">{product.description}</p>
            </section>
          )}
          <p className="text-muted-foreground text-xs">SKU: {product.sku}</p>
        </div>
      </div>
    </div>
  );
}

function ProductPageSkeleton() {
  return (
    <div role="status" aria-label="Loading product" className="grid gap-8 py-8 md:grid-cols-2">
      <Skeleton className="aspect-square rounded-lg" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-7 w-1/4" />
        <Skeleton className="h-10 w-1/2" />
      </div>
    </div>
  );
}
