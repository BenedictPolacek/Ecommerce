import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/format';
import type { ProductSummary } from '../types';

export function ProductCard({ product }: { product: ProductSummary }) {
  const outOfStock = product.stock_quantity <= 0;

  return (
    <article className="group relative flex flex-col gap-3">
      <div className="bg-muted aspect-square overflow-hidden rounded-lg border">
        {product.primary_image ? (
          <img
            src={product.primary_image.url}
            alt={product.primary_image.alt_text ?? product.name}
            // Images below the fold are only loaded when the user scrolls near them
            loading="lazy"
            className="size-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="text-muted-foreground flex size-full items-center justify-center text-sm">
            No image
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {product.category_name && (
          <p className="text-muted-foreground text-xs">{product.category_name}</p>
        )}
        <h2 className="font-medium">
          {/* The ::after overlay makes the whole card clickable with one accessible link */}
          <Link to={`/products/${product.slug}`} className="after:absolute after:inset-0">
            {product.name}
          </Link>
        </h2>
        <div className="flex items-center gap-2">
          <p className="font-semibold">{formatPrice(product.price_cents)}</p>
          {outOfStock && <Badge variant="secondary">Out of stock</Badge>}
        </div>
      </div>
    </article>
  );
}
