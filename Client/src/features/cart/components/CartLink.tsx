import { ShoppingCart } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { plural } from '@/lib/format';
import { useCart } from '../hooks';

/** Cart icon in the header with the number of items (visitors are asked to log in on click) */
export function CartLink() {
  const { data: cart } = useCart();
  const count = cart?.totalItems ?? 0;

  return (
    <Button asChild variant="ghost" size="icon" className="relative">
      <Link to="/cart" aria-label={count > 0 ? `Cart, ${plural(count, 'item')}` : 'Cart'}>
        <ShoppingCart />
        {count > 0 && (
          <span
            aria-hidden
            className="bg-primary text-primary-foreground absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full px-1 text-xs"
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Link>
    </Button>
  );
}
