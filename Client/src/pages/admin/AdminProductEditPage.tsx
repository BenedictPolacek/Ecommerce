import { ChevronLeft, ExternalLink } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { PageLoading, PageStatus } from '@/components/layout/PageStatus';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InventoryCountForm } from '@/features/admin-products/components/InventoryCountForm';
import { ProductForm } from '@/features/admin-products/components/ProductForm';
import { ProductImages } from '@/features/admin-products/components/ProductImages';
import { StockHistory } from '@/features/admin-products/components/StockHistory';
import { StockMovementForm } from '@/features/admin-products/components/StockMovementForm';
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
    <div className="flex max-w-3xl flex-col gap-10">
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
          {product.is_active ? (
            <Link
              to={`/products/${product.slug}`}
              className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
            >
              View in shop
              <ExternalLink className="size-3" aria-hidden />
            </Link>
          ) : (
            'Hidden products are not shown in the shop.'
          )}
        </p>
      </div>
      <section aria-labelledby="details-title" className="flex flex-col gap-4">
        <h3 id="details-title" className="text-lg font-semibold">
          Details
        </h3>
        {/* key: a different product starts a new form */}
        <ProductForm key={product.id} product={product} />
      </section>

      <section aria-labelledby="images-title" className="flex flex-col gap-4 border-t pt-8">
        <h3 id="images-title" className="text-lg font-semibold">
          Images
        </h3>
        <ProductImages product={product} />
      </section>

      <section aria-labelledby="stock-title" className="flex flex-col gap-6 border-t pt-8">
        <div>
          <h3 id="stock-title" className="text-lg font-semibold">
            Stock: {product.stock_quantity}
          </h3>
          <p className="text-muted-foreground text-sm">
            Every change is booked with a reason, so the history always adds up to the stock.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          <StockMovementForm productId={product.id} />
          <InventoryCountForm productId={product.id} currentStock={product.stock_quantity} />
        </div>
        <StockHistory productId={product.id} />
      </section>
    </div>
  );
}
