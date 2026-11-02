import { ChevronLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { PageLoading, PageStatus } from '@/components/layout/PageStatus';
import { Button } from '@/components/ui/button';
import { AddressBlock } from '@/features/addresses/components/AddressBlock';
import { BankTransferDetails } from '@/features/orders/components/BankTransferDetails';
import { OrderItems } from '@/features/orders/components/OrderItems';
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge';
import { OrderTimeline } from '@/features/orders/components/OrderTimeline';
import { useOrder } from '@/features/orders/hooks';
import { ORDER_STATUS, paidCents } from '@/features/orders/status';
import { ApiError } from '@/lib/api-client';
import { formatDateTime, formatPrice } from '@/lib/format';

export function OrderDetailPage() {
  const { orderNumber = '' } = useParams();
  const { data: order, isPending, isError, error, refetch } = useOrder(orderNumber);

  if (isPending) return <PageLoading />;

  if (isError) {
    // 404 also for orders of other customers: the API does not reveal that they exist
    if (error instanceof ApiError && error.status === 404) {
      return (
        <PageStatus title="Order not found">
          <Button asChild variant="outline">
            <Link to="/orders">Back to your orders</Link>
          </Button>
        </PageStatus>
      );
    }
    return (
      <PageStatus title="Order could not be loaded">
        <Button onClick={() => refetch()}>Try again</Button>
      </PageStatus>
    );
  }

  const paid = paidCents(order);
  const outstanding = order.total_cents - paid;

  return (
    <div className="flex flex-col gap-8 py-8">
      <title>{`Order ${order.order_number} | Ecommerce Shop`}</title>

      <div className="flex flex-col gap-2">
        <Button asChild variant="link" className="self-start px-0">
          <Link to="/orders">
            <ChevronLeft />
            All orders
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">Order {order.order_number}</h1>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="text-muted-foreground text-sm">
          Placed on <time dateTime={order.created_at}>{formatDateTime(order.created_at)}</time>.{' '}
          {ORDER_STATUS[order.status].description}
        </p>
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-8">
          {order.status === 'pending' && outstanding > 0 && (
            <>
              {paid > 0 && (
                <p className="text-sm" role="status">
                  We have received {formatPrice(paid)} of {formatPrice(order.total_cents)}.
                </p>
              )}
              <BankTransferDetails amountCents={outstanding} orderNumber={order.order_number} />
            </>
          )}
          <OrderItems order={order} />
        </div>

        <aside className="flex flex-col gap-8">
          <section aria-labelledby="shipping-title" className="flex flex-col gap-2">
            <h2 id="shipping-title" className="text-lg font-semibold">
              Shipping address
            </h2>
            <AddressBlock address={order.shipping_address} />
          </section>
          <section aria-labelledby="billing-title" className="flex flex-col gap-2">
            <h2 id="billing-title" className="text-lg font-semibold">
              Billing address
            </h2>
            <AddressBlock address={order.billing_address} />
          </section>
          <OrderTimeline history={order.status_history} />
        </aside>
      </div>
    </div>
  );
}
