import { Link, useNavigate } from 'react-router';
import { PageLoading, PageStatus } from '@/components/layout/PageStatus';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAddresses } from '@/features/addresses/hooks';
import { ResendVerificationButton } from '@/features/auth/components/ResendVerificationButton';
import { useCurrentUser } from '@/features/auth/hooks';
import { getItemProblem } from '@/features/cart/cart-problems';
import { CartSummary } from '@/features/cart/components/CartSummary';
import { useCart } from '@/features/cart/hooks';
import { CheckoutForm } from '@/features/orders/components/CheckoutForm';
import { formatPrice } from '@/lib/format';

export function CheckoutPage() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const cart = useCart();
  const addresses = useAddresses();

  if (cart.isPending || addresses.isPending) return <PageLoading />;

  if (cart.isError || addresses.isError) {
    return (
      <PageStatus title="Checkout could not be loaded">
        <Button
          onClick={() => {
            void cart.refetch();
            void addresses.refetch();
          }}
        >
          Try again
        </Button>
      </PageStatus>
    );
  }

  // No <Navigate> here: right after ordering the cart is empty while we leave the page
  if (cart.data.items.length === 0) {
    return (
      <PageStatus title="Your cart is empty">
        <Button asChild>
          <Link to="/">Continue shopping</Link>
        </Button>
      </PageStatus>
    );
  }

  if (cart.data.items.some((item) => getItemProblem(item) !== null)) {
    return (
      <PageStatus title="Some items need your attention">
        <p className="text-muted-foreground">Please check your cart before ordering.</p>
        <Button asChild>
          <Link to="/cart">Back to cart</Link>
        </Button>
      </PageStatus>
    );
  }

  const verified = !!user?.email_verified_at;

  return (
    <div className="flex flex-col gap-6 py-8">
      <title>Checkout | Ecommerce Shop</title>
      <h1 className="text-2xl font-bold">Checkout</h1>

      {!verified && user && (
        <Alert>
          <AlertTitle>Please confirm your email address</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            We need a confirmed email address before you can order. Check your inbox at{' '}
            {`${user.email}.`}
            <ResendVerificationButton email={user.email} variant="outline" size="sm" />
          </AlertDescription>
        </Alert>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <CheckoutForm
          addresses={addresses.data}
          totalCents={cart.data.totalCents}
          canOrder={verified}
          onSuccess={(order) =>
            // replace: the back button should not lead to the (now empty) checkout
            navigate(`/checkout/confirmation/${order.order_number}`, { replace: true })
          }
        />

        <CartSummary cart={cart.data}>
          <ul className="flex flex-col gap-2 border-t pt-4 text-sm">
            {cart.data.items.map((item) => (
              <li key={item.cart_item_id} className="flex justify-between gap-2">
                <span>
                  {item.quantity} × {item.product_name}
                </span>
                <span>{formatPrice(item.line_total_cents)}</span>
              </li>
            ))}
          </ul>
          <Button asChild variant="link">
            <Link to="/cart">Edit cart</Link>
          </Button>
        </CartSummary>
      </div>
    </div>
  );
}
