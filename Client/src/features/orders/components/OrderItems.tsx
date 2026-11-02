import { formatPrice } from '@/lib/format';
import type { Order } from '../types';

/** Items with the prices at the time of the order, and the order totals */
export function OrderItems({ order }: { order: Order }) {
  return (
    <section aria-labelledby="items-title" className="flex flex-col gap-3">
      <h2 id="items-title" className="text-lg font-semibold">
        Items
      </h2>
      <ul className="flex flex-col gap-2 text-sm">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4">
            <span>
              {item.quantity} × {item.product_name}
            </span>
            <span>{formatPrice(item.unit_price_cents * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <dl className="flex flex-col gap-1 border-t pt-3 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{formatPrice(order.subtotal_cents)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Shipping</dt>
          <dd>{order.shipping_fee_cents === 0 ? 'Free' : formatPrice(order.shipping_fee_cents)}</dd>
        </div>
        <div className="flex justify-between font-semibold">
          <dt>Total</dt>
          <dd>{formatPrice(order.total_cents)}</dd>
        </div>
        <div className="text-muted-foreground flex justify-between">
          <dt>Incl. {order.vat_rate_percent}% VAT</dt>
          <dd>{formatPrice(order.tax_cents)}</dd>
        </div>
      </dl>
    </section>
  );
}
