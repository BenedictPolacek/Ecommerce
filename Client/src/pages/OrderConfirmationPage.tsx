import { CircleCheck } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { PageLoading, PageStatus } from '@/components/layout/PageStatus';
import { Button } from '@/components/ui/button';
import { AddressBlock } from '@/features/addresses/components/AddressBlock';
import { BankTransferDetails } from '@/features/orders/components/BankTransferDetails';
import { OrderItems } from '@/features/orders/components/OrderItems';
import { useOrder } from '@/features/orders/hooks';

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

      <BankTransferDetails amountCents={order.total_cents} orderNumber={order.order_number} />

      <OrderItems order={order} />

      <section aria-labelledby="address-title" className="flex flex-col gap-2">
        <h2 id="address-title" className="text-lg font-semibold">
          Shipping to
        </h2>
        <AddressBlock address={order.shipping_address} />
      </section>

      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link to="/">Continue shopping</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/orders">View your orders</Link>
        </Button>
      </div>
    </div>
  );
}
