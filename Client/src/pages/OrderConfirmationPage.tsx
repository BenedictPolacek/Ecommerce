import { CircleCheck } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { CopyButton } from '@/components/CopyButton';
import { PageLoading, PageStatus } from '@/components/layout/PageStatus';
import { Button } from '@/components/ui/button';
import { AddressBlock } from '@/features/addresses/components/AddressBlock';
import { useOrder } from '@/features/orders/hooks';
import { formatPrice } from '@/lib/format';
import { BANK_ACCOUNT, PAYMENT_DUE_DAYS } from '@/lib/shop-config';

export function OrderConfirmationPage() {
  const { orderNumber = '' } = useParams();
  const { data: order, isPending, isError } = useOrder(orderNumber);

  if (isPending) return <PageLoading />;

  if (isError) {
    return (
      <PageStatus title="Order not found">
        <Button asChild variant="outline">
          <Link to="/">Back to the shop</Link>
        </Button>
      </PageStatus>
    );
  }

  const paymentDetails = [
    { label: 'Account holder', value: BANK_ACCOUNT.holder },
    { label: 'IBAN', value: BANK_ACCOUNT.iban },
    { label: 'BIC', value: BANK_ACCOUNT.bic },
    { label: 'Amount', value: formatPrice(order.total_cents) },
    // The order number as reference lets us match the transfer to the order
    { label: 'Reference', value: order.order_number },
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 py-12">
      <title>{`Order ${order.order_number} | Ecommerce Shop`}</title>

      <div className="flex flex-col items-center gap-3 text-center">
        <CircleCheck className="size-12 text-green-600" aria-hidden />
        <h1 className="text-2xl font-bold">Thank you for your order!</h1>
        <p className="text-muted-foreground">
          Your order number is <strong className="text-foreground">{order.order_number}</strong>.
        </p>
      </div>

      <section
        aria-labelledby="payment-title"
        className="flex flex-col gap-4 rounded-lg border p-6"
      >
        <h2 id="payment-title" className="text-lg font-semibold">
          Please transfer {formatPrice(order.total_cents)}
        </h2>
        <p className="text-muted-foreground text-sm">
          Please pay within {PAYMENT_DUE_DAYS} days. We ship your order as soon as the payment has
          arrived.
        </p>
        <dl className="flex flex-col gap-1 text-sm">
          {paymentDetails.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="flex items-center gap-1 font-medium">
                {value}
                {(label === 'IBAN' || label === 'Reference') && (
                  <CopyButton value={value.replaceAll(' ', '')} label={label} />
                )}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-muted-foreground text-xs">
          Demo shop: these are example bank details, do not send real money.
        </p>
      </section>

      <section aria-labelledby="items-title" className="flex flex-col gap-3">
        <h2 id="items-title" className="text-lg font-semibold">
          Your order
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
            <dt>Shipping</dt>
            <dd>
              {order.shipping_fee_cents === 0 ? 'Free' : formatPrice(order.shipping_fee_cents)}
            </dd>
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

      <section aria-labelledby="address-title" className="flex flex-col gap-2">
        <h2 id="address-title" className="text-lg font-semibold">
          Shipping to
        </h2>
        <AddressBlock address={order.shipping_address} />
      </section>

      <Button asChild className="self-center">
        <Link to="/">Continue shopping</Link>
      </Button>
    </div>
  );
}
