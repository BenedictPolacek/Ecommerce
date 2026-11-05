import { ChevronLeft } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { PageLoading, PageStatus } from '@/components/layout/PageStatus';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DeleteCustomerButton } from '@/features/admin-customers/components/DeleteCustomerButton';
import { useCustomer } from '@/features/admin-customers/hooks';
import type { Customer } from '@/features/admin-customers/types';
import { useAdminOrders } from '@/features/admin-orders/hooks';
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge';
import { ApiError } from '@/lib/api-client';
import { formatDate, formatPrice } from '@/lib/format';

const RECENT_ORDERS = 10;

function RecentOrders({ customer }: { customer: Customer }) {
  const { data, isError } = useAdminOrders({
    userId: customer.id,
    page: 1,
    limit: RECENT_ORDERS,
  });

  if (customer.stats.order_count === 0) {
    return <p className="text-muted-foreground text-sm">No orders yet.</p>;
  }
  if (isError) {
    return <p className="text-destructive text-sm">Orders could not be loaded.</p>;
  }
  if (!data) {
    return (
      <div role="status" aria-label="Loading orders" className="flex flex-col gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Table aria-label="Orders of this customer">
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Date</TableHead>
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
                <OrderStatusBadge status={order.status} />
              </TableCell>
              <TableCell className="text-right">{formatPrice(order.total_cents)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.pagination.total > RECENT_ORDERS && (
        <p className="text-muted-foreground text-sm">
          Latest {RECENT_ORDERS} of {data.pagination.total} orders.{' '}
          <Link
            to={`/admin/orders?search=${encodeURIComponent(customer.email)}`}
            className="underline underline-offset-4"
          >
            Search all orders by email
          </Link>
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-4">
      <dt className="text-muted-foreground text-sm">{label}</dt>
      <dd className="text-xl font-semibold">{value}</dd>
    </div>
  );
}

export function AdminCustomerDetailPage() {
  const { userId = '' } = useParams();
  const { data: customer, isPending, isError, error, refetch } = useCustomer(userId);

  if (isPending) return <PageLoading />;

  if (isError) {
    // 400: not a valid UUID in the URL, 404: no such (or a deleted) user
    const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400);
    return (
      <PageStatus title={notFound ? 'Customer not found' : 'Customer could not be loaded'}>
        {notFound ? (
          <Button asChild variant="outline">
            <Link to="/admin/customers">Back to all customers</Link>
          </Button>
        ) : (
          <Button onClick={() => refetch()}>Try again</Button>
        )}
      </PageStatus>
    );
  }

  const name = `${customer.first_name} ${customer.last_name}`;
  const { stats } = customer;

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <title>{`${name} | Admin | Ecommerce Shop`}</title>
      <div className="flex flex-col gap-2">
        <Button asChild variant="link" className="self-start px-0">
          <Link to="/admin/customers">
            <ChevronLeft />
            All customers
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold">{name}</h2>
          {customer.role === 'admin' && <Badge variant="secondary">Admin</Badge>}
          {customer.email_verified_at ? (
            <Badge variant="outline">Email verified</Badge>
          ) : (
            <Badge variant="outline">Not verified</Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          <a href={`mailto:${customer.email}`} className="underline-offset-4 hover:underline">
            {customer.email}
          </a>{' '}
          · Member since{' '}
          <time dateTime={customer.created_at}>{formatDate(customer.created_at)}</time>
        </p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-3">
        <Stat label="Orders" value={String(stats.order_count)} />
        <Stat label="Spent (paid orders)" value={formatPrice(stats.spent_cents)} />
        <Stat
          label="Last order"
          value={stats.last_order_at ? formatDate(stats.last_order_at) : '–'}
        />
      </dl>

      <section aria-labelledby="customer-orders-title" className="flex flex-col gap-4">
        <h3 id="customer-orders-title" className="text-lg font-semibold">
          Orders
        </h3>
        <RecentOrders customer={customer} />
      </section>

      <section
        aria-labelledby="delete-customer-title"
        className="flex flex-col gap-3 border-t pt-8"
      >
        <h3 id="delete-customer-title" className="text-lg font-semibold">
          Delete customer
        </h3>
        {customer.role === 'admin' ? (
          // The server refuses it too: a hijacked admin account cannot remove the others
          <p className="text-muted-foreground text-sm">Admin accounts cannot be deleted here.</p>
        ) : (
          <>
            <p className="text-muted-foreground text-sm">
              For deletion requests by email or phone (GDPR). Not possible while orders are still
              open.
            </p>
            <DeleteCustomerButton customer={customer} />
          </>
        )}
      </section>
    </div>
  );
}
