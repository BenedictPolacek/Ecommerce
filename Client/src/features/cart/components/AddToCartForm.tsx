import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { QuantityInput } from '@/components/form/QuantityInput';
import { Button } from '@/components/ui/button';
import { useCurrentUser } from '@/features/auth/hooks';
import { getErrorMessage } from '@/lib/form-errors';
import { useAddToCart } from '../hooks';

interface AddToCartFormProps {
  productId: string;
  productName: string;
  stock: number;
}

export function AddToCartForm({ productId, productName, stock }: AddToCartFormProps) {
  const [quantity, setQuantity] = useState(1);
  const { data: user } = useCurrentUser();
  const addToCart = useAddToCart();
  const navigate = useNavigate();
  const location = useLocation();

  if (stock <= 0) {
    return (
      <Button disabled size="lg">
        Out of stock
      </Button>
    );
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    // The cart belongs to an account: log in first, then come back to this product
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }

    addToCart.mutate(
      { productId, quantity },
      {
        onSuccess: () => {
          toast.success(`Added ${quantity} × ${productName} to your cart`);
          setQuantity(1);
        },
        // e.g. "Cannot add 3 more. Current stock is 5 (you have 4 in cart)"
        onError: (error) => toast.error(getErrorMessage(error)),
      }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
      <QuantityInput value={quantity} onChange={setQuantity} max={stock} />
      <Button type="submit" size="lg" disabled={addToCart.isPending}>
        {addToCart.isPending ? 'Adding…' : 'Add to cart'}
      </Button>
    </form>
  );
}
