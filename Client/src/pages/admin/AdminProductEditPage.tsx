import { ChevronLeft, ExternalLink } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { PageLoading, PageStatus } from '@/components/layout/PageStatus';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProductForm } from '@/features/admin-products/components/ProductForm';
import { useAdminProduct } from '@/features/admin-products/hooks';
import { ApiError } from '@/lib/api-client';

export function AdminProductEditPage() {
  const { productId = '' } = useParams();
  const { data: product, isPending, isError, error, refetch } = useAdminProduct(productId);

  if (isPending) return <PageLoading />;

  if (isError) {
    // 400: not a valid UUID in the URL, 404: no such product. Both mean "not found" here.
    const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400);
    return (
      <PageStatus title={notFound ? 'Product not found' : 'Product could not be loaded'}>
        {notFound ? (
          <Button asChild variant="outline">
            <Link to="/admin/products">Back to all products</Link>
          </Button>
        ) : (
          <Button onClick={() => refetch()}>Try again</Button>
        )}
      </PageStatus>
    );
  }

  return (
    <section aria-labelledby="edit-product-title" className="flex max-w-2xl flex-col gap-6">
      <title>{`${product.name} | Admin | Ecommerce Shop`}</title>
      <div className="flex flex-col gap-2">
        <Button asChild variant="link" className="self-start px-0">
          <Link to="/admin/products">
            <ChevronLeft />
            All products
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="edit-product-title" className="text-xl font-bold">
            {product.name}
          </h2>
          <Badge variant={product.is_active ? 'secondary' : 'outline'}>
            {product.is_active ? 'Visible' : 'Hidden'}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          Stock: {product.stock_quantity}
          {product.is_active && (
            <>
              {' · '}
              <Link
                to={`/products/${product.slug}`}
                className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
              >
                View in shop
                <ExternalLink className="size-3" aria-hidden />
              </Link>
            </>
          )}
        </p>
      </div>
      {/* key: a different product (or a fresh copy after saving elsewhere) starts a new form */}
      <ProductForm key={product.id} product={product} />
    </section>
  );
}
