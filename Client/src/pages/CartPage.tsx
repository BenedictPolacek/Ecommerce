import { Link } from 'react-router';
import { PageLoading, PageStatus } from '@/components/layout/PageStatus';
import { Button } from '@/components/ui/button';
import { getItemProblem } from '@/features/cart/cart-problems';
import { CartItemRow } from '@/features/cart/components/CartItemRow';
import { CartSummary } from '@/features/cart/components/CartSummary';
import { ClearCartButton } from '@/features/cart/components/ClearCartButton';
import { useCart } from '@/features/cart/hooks';

export function CartPage() {
  const { data: cart, isPending, isError, refetch } = useCart();

  if (isPending) return <PageLoading />;

  if (isError) {
    return (
      <PageStatus title="Your cart could not be loaded">
        <Button onClick={() => refetch()}>Try again</Button>
      </PageStatus>
    );
  }

  if (cart.items.length === 0) {
    return (
      <PageStatus title="Your cart is empty">
        <Button asChild>
          <Link to="/">Continue shopping</Link>
        </Button>
      </PageStatus>
    );
  }

  const hasProblems = cart.items.some((item) => getItemProblem(item) !== null);

  return (
    <div className="flex flex-col gap-6 py-8">
      <title>Cart | Ecommerce Shop</title>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Your cart</h1>
        <ClearCartButton />
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <ul className="divide-y border-y">
          {cart.items.map((item) => (
            <CartItemRow key={item.cart_item_id} item={item} />
          ))}
        </ul>

        <CartSummary cart={cart}>
          {hasProblems && (
            <p role="alert" className="text-destructive text-sm">
              Please fix the marked items before checking out.
            </p>
          )}
          {hasProblems ? (
            <Button size="lg" disabled>
              Proceed to checkout
            </Button>
          ) : (
            <Button asChild size="lg">
              <Link to="/checkout">Proceed to checkout</Link>
            </Button>
          )}
          <Button asChild variant="link">
            <Link to="/">Continue shopping</Link>
          </Button>
        </CartSummary>
      </div>
    </div>
  );
}
