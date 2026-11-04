import { Search } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Pagination } from '@/components/Pagination';
import { PageStatus } from '@/components/layout/PageStatus';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminOrders } from '@/features/admin-orders/hooks';
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge';
import { isOrderStatus, ORDER_STATUS, ORDER_STATUSES } from '@/features/orders/status';
import type { OrderStatus } from '@/features/orders/types';
import { formatDate, formatPrice } from '@/lib/format';

const PAGE_SIZE = 20;

interface Filters {
  status?: OrderStatus;
  search?: string;
  page?: number;
}

/** ?status=paid&search=anna&page=2 (a new filter always starts on page 1) */
function adminOrdersHref({ status, search, page }: Filters) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  if (page && page > 1) params.set('page', String(page));
  const query = params.toString();
  return `/admin/orders${query ? `?${query}` : ''}`;
}

export function AdminOrdersPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const statusParam = searchParams.get('status');
  const status = isOrderStatus(statusParam) ? statusParam : undefined;
  const search = searchParams.get('search')?.trim() || undefined;
  const pageParam = Number(searchParams.get('page'));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const { data, isError, isPlaceholderData, refetch } = useAdminOrders({
    status,
    search,
    page,
    limit: PAGE_SIZE,
  });

  return (
    <section aria-labelledby="admin-orders-title" className="flex flex-col gap-6">
      <title>Orders | Admin | Ecommerce Shop</title>
      <h2 id="admin-orders-title" className="text-lg font-semibold">
        Orders
      </h2>

      <div className="flex flex-wrap items-end gap-4">
        <form
          role="search"
          className="flex flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get('search');
            navigate(adminOrdersHref({ status, search: String(value ?? '').trim() }));
          }}
        >
          <Input
            // A new URL (e.g. back button) resets the field to the search in the URL
            key={search ?? ''}
            name="search"
            type="search"
            defaultValue={search}
            aria-label="Search orders"
            placeholder="Order number or customer email"
            className="max-w-sm"
          />
          <Button type="submit" variant="outline">
            <Search />
            Search
          </Button>
        </form>
        <label className="flex items-center gap-2 text-sm">
          Status
          <select
            value={status ?? ''}
            onChange={(event) =>
              navigate(
                adminOrdersHref({
                  status: (event.target.value || undefined) as OrderStatus | undefined,
                  search,
                })
              )
            }
            className="border-input h-9 rounded-md border bg-transparent px-3 shadow-xs"
          >
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((value) => (
              <option key={value} value={value}>
                {ORDER_STATUS[value].label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isError ? (
        <PageStatus title="Orders could not be loaded">
          <Button onClick={() => refetch()}>Try again</Button>
        </PageStatus>
      ) : !data ? (
        <div role="status" aria-label="Loading orders" className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : data.orders.length === 0 ? (
        <PageStatus title="No orders found">
          {(status || search) && (
            <Button asChild variant="outline">
              <Link to="/admin/orders">Show all orders</Link>
            </Button>
          )}
        </PageStatus>
      ) : (
        <Table className={isPlaceholderData ? 'opacity-60' : undefined}>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <Link
                    to={`/admin/orders/${order.order_number}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {order.order_number}
                  </Link>
                </TableCell>
                <TableCell>
                  <time dateTime={order.created_at}>{formatDate(order.created_at)}</time>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>
                      {order.customer.first_name} {order.customer.last_name}
                    </span>
                    <span className="text-muted-foreground text-xs">{order.customer.email}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{order.item_count}</TableCell>
                <TableCell>
                  <OrderStatusBadge status={order.status} />
                </TableCell>
                <TableCell className="text-right">{formatPrice(order.total_cents)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && (
        <Pagination
          page={page}
          totalPages={data.pagination.totalPages}
          hrefFor={(target) => adminOrdersHref({ status, search, page: target })}
        />
      )}
    </section>
  );
}
