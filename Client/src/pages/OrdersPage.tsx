import { Link, useNavigate, useSearchParams } from 'react-router';
import { Pagination } from '@/components/Pagination';
import { PageStatus } from '@/components/layout/PageStatus';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge';
import { useMyOrders } from '@/features/orders/hooks';
import { isOrderStatus, ORDER_STATUS, ORDER_STATUSES } from '@/features/orders/status';
import type { OrderStatus } from '@/features/orders/types';
import { formatDate, formatPrice, plural } from '@/lib/format';

const PAGE_SIZE = 10;

/** ?status=shipped&page=2 -> filters in the URL, like the shop page */
function ordersSearch({ status, page }: { status?: OrderStatus; page?: number }) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (page && page > 1) params.set('page', String(page));
  const search = params.toString();
  return search ? `?${search}` : '';
}

export function OrdersPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const statusParam = searchParams.get('status');
  const status = isOrderStatus(statusParam) ? statusParam : undefined;
  const pageParam = Number(searchParams.get('page'));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const { data, isError, isPlaceholderData, refetch } = useMyOrders({
    status,
    page,
    limit: PAGE_SIZE,
  });

  return (
    <div className="flex flex-col gap-6 py-8">
      <title>My orders | Ecommerce Shop</title>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">My orders</h1>
        <label className="flex items-center gap-2 text-sm">
          Status
          <select
            value={status ?? ''}
            onChange={(event) =>
              navigate(
                `/orders${ordersSearch({ status: event.target.value as OrderStatus | undefined })}`
              )
            }
            className="border-input h-9 rounded-md border bg-transparent px-3 shadow-xs"
          >
            <option value="">All orders</option>
            {ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {ORDER_STATUS[value].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isError ? (
        <PageStatus title="Your orders could not be loaded">
          <Button onClick={() => refetch()}>Try again</Button>
        </PageStatus>
      ) : !data ? (
        <div role="status" aria-label="Loading orders" className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : data.orders.length === 0 ? (
        <PageStatus title={status ? 'No orders with this status' : 'You have no orders yet'}>
          <Button asChild variant="outline">
            <Link to={status ? '/orders' : '/'}>
              {status ? 'Show all orders' : 'Start shopping'}
            </Link>
          </Button>
        </PageStatus>
      ) : (
        <ul
          className={`flex flex-col divide-y rounded-lg border ${isPlaceholderData ? 'opacity-60' : ''}`}
        >
          {data.orders.map((order) => (
            <li
              key={order.id}
              className="hover:bg-accent relative flex flex-wrap items-center gap-4 p-4"
            >
              <div className="flex flex-1 flex-col">
                <Link
                  to={`/orders/${order.order_number}`}
                  className="font-medium after:absolute after:inset-0"
                >
                  {order.order_number}
                </Link>
                <span className="text-muted-foreground text-sm">
                  <time dateTime={order.created_at}>{formatDate(order.created_at)}</time> ·{' '}
                  {plural(order.item_count, 'item')}
                </span>
              </div>
              <OrderStatusBadge status={order.status} />
              <span className="w-24 text-right font-semibold">
                {formatPrice(order.total_cents)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {data && (
        <Pagination
          page={page}
          totalPages={data.pagination.totalPages}
          hrefFor={(target) => `/orders${ordersSearch({ status, page: target })}`}
        />
      )}
    </div>
  );
}
