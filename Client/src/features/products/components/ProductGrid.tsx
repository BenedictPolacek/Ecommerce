import { Skeleton } from '@/components/ui/skeleton';
import type { ProductSummary } from '../types';
import { ProductCard } from './ProductCard';

const gridClass = 'grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4';

export function ProductGrid({ products }: { products: ProductSummary[] }) {
  return (
    <ul className={gridClass}>
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

/** Grey placeholders in the shape of the grid while the first page loads */
export function ProductGridSkeleton({ count }: { count: number }) {
  return (
    <div role="status" aria-label="Loading products" className={gridClass}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="aspect-square rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </div>
  );
}
