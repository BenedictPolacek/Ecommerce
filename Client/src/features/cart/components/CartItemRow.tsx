import { Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { QuantityInput } from '@/components/form/QuantityInput';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/form-errors';
import { formatPrice } from '@/lib/format';
import { useRemoveCartItem, useUpdateCartItem } from '../hooks';
import { getItemProblem } from '../cart-problems';
import type { CartItem } from '../types';

export function CartItemRow({ item }: { item: CartItem }) {
  const update = useUpdateCartItem();
  const remove = useRemoveCartItem();
  const busy = update.isPending || remove.isPending;
  const problem = getItemProblem(item);
  const onError = (error: Error) => toast.error(getErrorMessage(error));

  return (
    <li className="flex gap-4 py-4" aria-busy={busy}>
      <Link
        to={`/products/${item.product_slug}`}
        className="bg-muted size-24 shrink-0 overflow-hidden rounded-md border"
        tabIndex={-1}
        aria-hidden
      >
        {item.primary_image && (
          <img
            src={item.primary_image.url}
            alt=""
            loading="lazy"
            className="size-full object-cover"
          />
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex justify-between gap-4">
          <div>
            <h2 className="font-medium">
              <Link to={`/products/${item.product_slug}`} className="hover:underline">
                {item.product_name}
              </Link>
            </h2>
            <p className="text-muted-foreground text-sm">{formatPrice(item.price_cents)} each</p>
            {problem && <p className="text-destructive text-sm font-medium">{problem}</p>}
          </div>
          <p className="font-semibold">{formatPrice(item.line_total_cents)}</p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <QuantityInput
            value={item.quantity}
            max={Math.max(item.stock_quantity, 1)}
            label={`Quantity of ${item.product_name}`}
            disabled={busy || !item.is_active}
            onChange={(quantity) =>
              quantity !== item.quantity &&
              update.mutate({ productId: item.product_id, quantity }, { onError })
            }
          />
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => remove.mutate(item.product_id, { onError })}
            aria-label={`Remove ${item.product_name}`}
          >
            <Trash2 />
            Remove
          </Button>
        </div>
      </div>
    </li>
  );
}
