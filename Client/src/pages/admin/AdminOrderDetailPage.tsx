import { ChevronLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { PageLoading, PageStatus } from '@/components/layout/PageStatus';
import { Button } from '@/components/ui/button';
import { AddressBlock } from '@/features/addresses/components/AddressBlock';
import { AdminOrderTimeline } from '@/features/admin-orders/components/AdminOrderTimeline';
import { PaymentList } from '@/features/admin-orders/components/PaymentList';
import { RecordPaymentForm } from '@/features/admin-orders/components/RecordPaymentForm';
import { StatusActions } from '@/features/admin-orders/components/StatusActions';
import { useAdminOrder } from '@/features/admin-orders/hooks';
import { OrderItems } from '@/features/orders/components/OrderItems';
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge';
import { paidCents } from '@/features/orders/status';
import { isAnonymized } from '@/features/admin-customers/api';
import { ApiError } from '@/lib/api-client';
import { formatDateTime, formatPrice } from '@/lib/format';

export function AdminOrderDetailPage() {
  const { orderNumber = '' } = useParams();
  const { data: order, isPending, isError, error, refetch } = useAdminOrder(orderNumber);

  if (isPending) return <PageLoading />;

  if (isError) {
    return (
      <PageStatus
        title={
          error instanceof ApiError && error.status === 404
            ? 'Order not found'
            : 'Order could not be loaded'
        }
      >
        {error instanceof ApiError && error.status === 404 ? (
          <Button asChild variant="outline">
            <Link to="/admin/orders">Back to all orders</Link>
          </Button>
        ) : (
          <Button onClick={() => refetch()}>Try again</Button>
        )}
      </PageStatus>
    );
  }

  const paid = paidCents(order);
  const outstanding = order.total_cents - paid;
  const { customer } = order;

  return (
    <div className="flex flex-col gap-8">
      <title>{`Order ${order.order_number} | Admin | Ecommerce Shop`}</title>

      <div className="flex flex-col gap-2">
        <Button asChild variant="link" className="self-start px-0">
          <Link to="/admin/orders">
            <ChevronLeft />
            All orders
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold">Order {order.order_number}</h2>
          <OrderStatusBadge status={order.status} />
        </div>
        <p className="text-muted-foreground text-sm">
          Placed on <time dateTime={order.created_at}>{formatDateTime(order.created_at)}</time>
        </p>
      </div>

      <section
        aria-labelledby="actions-title"
        className="flex flex-col gap-3 rounded-lg border p-4"
      >
        <h3 id="actions-title" className="font-semibold">
          Next steps
        </h3>
        <StatusActions order={order} />
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_18rem]">
        <div className="flex flex-col gap-8">
          <section aria-labelledby="payments-title" className="flex flex-col gap-3">
            <h3 id="payments-title" className="text-lg font-semibold">
              Payments
            </h3>
            <p className="text-sm">
              Paid {formatPrice(paid)} of {formatPrice(order.total_cents)}
              {outstanding > 0 && <> · Outstanding {formatPrice(outstanding)}</>}
            </p>
            <PaymentList payments={order.payments} />
            {/* Payments can only be recorded while the order waits for its money */}
            {order.status === 'pending' && outstanding > 0 && (
              <div className="flex flex-col gap-2 rounded-lg border p-4">
                <h4 className="font-medium">Record a bank transfer</h4>
                {/* key: after a partial payment the form starts with the new outstanding amount */}
                <RecordPaymentForm
                  key={outstanding}
                  orderId={order.id}
                  outstandingCents={outstanding}
                />
              </div>
            )}
          </section>
          <OrderItems order={order} />
        </div>

        <aside className="flex flex-col gap-8">
          <section aria-labelledby="customer-title" className="flex flex-col gap-1 text-sm">
            <h3 id="customer-title" className="text-lg font-semibold">
              Customer
            </h3>
            {/* Deleted customers are anonymized: there is no customer page any more */}
            {isAnonymized(customer) ? (
              <span>
                {customer.first_name} {customer.last_name}
              </span>
            ) : (
              <Link
                to={`/admin/customers/${customer.id}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {customer.first_name} {customer.last_name}
              </Link>
            )}
            <a href={`mailto:${customer.email}`} className="underline-offset-4 hover:underline">
              {customer.email}
            </a>
          </section>
          <section aria-labelledby="shipping-title" className="flex flex-col gap-2">
            <h3 id="shipping-title" className="text-lg font-semibold">
              Shipping address
            </h3>
            <AddressBlock address={order.shipping_address} />
          </section>
          <section aria-labelledby="billing-title" className="flex flex-col gap-2">
            <h3 id="billing-title" className="text-lg font-semibold">
              Billing address
            </h3>
            <AddressBlock address={order.billing_address} />
          </section>
          <AdminOrderTimeline history={order.status_history} />
        </aside>
      </div>
    </div>
  );
}
