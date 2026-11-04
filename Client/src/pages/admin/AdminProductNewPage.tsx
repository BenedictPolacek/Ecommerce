import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { ProductForm } from '@/features/admin-products/components/ProductForm';

export function AdminProductNewPage() {
  return (
    <section aria-labelledby="new-product-title" className="flex max-w-2xl flex-col gap-6">
      <title>New product | Admin | Ecommerce Shop</title>
      <div className="flex flex-col gap-2">
        <Button asChild variant="link" className="self-start px-0">
          <Link to="/admin/products">
            <ChevronLeft />
            All products
          </Link>
        </Button>
        <h2 id="new-product-title" className="text-xl font-bold">
          New product
        </h2>
      </div>
      <ProductForm />
    </section>
  );
}
