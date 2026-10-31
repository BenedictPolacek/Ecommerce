import type { ReactNode } from 'react';
import { formatPrice, plural } from '@/lib/format';
import type { Cart } from '../types';

/** Totals come from the server (same calculation as checkout), never computed in the browser */
export function CartSummary({ cart, children }: { cart: Cart; children?: ReactNode }) {
  return (
    <section aria-labelledby="summary-title" className="flex flex-col gap-4 rounded-lg border p-6">
      <h2 id="summary-title" className="text-lg font-semibold">
        Order summary
      </h2>

      <dl className="flex flex-col gap-2 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal ({plural(cart.totalItems, 'item')})</dt>
          <dd>{formatPrice(cart.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Shipping</dt>
          <dd>{cart.shippingFeeCents === 0 ? 'Free' : formatPrice(cart.shippingFeeCents)}</dd>
        </div>
        <div className="flex justify-between border-t pt-2 text-base font-semibold">
          <dt>Total</dt>
          <dd>{formatPrice(cart.totalCents)}</dd>
        </div>
        <div className="text-muted-foreground flex justify-between">
          <dt>Incl. VAT</dt>
          <dd>{formatPrice(cart.taxCents)}</dd>
        </div>
      </dl>

      {children}
    </section>
  );
}
