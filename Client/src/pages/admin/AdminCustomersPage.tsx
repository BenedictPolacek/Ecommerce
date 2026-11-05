import { Search } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Pagination } from '@/components/Pagination';
import { PageStatus } from '@/components/layout/PageStatus';
import { Badge } from '@/components/ui/badge';
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
import { useCustomers } from '@/features/admin-customers/hooks';
import type { UserRole } from '@/features/auth/types';
import { formatDate } from '@/lib/format';

const PAGE_SIZE = 20;

/** URL value of the role filter; customers are the default */
type RoleFilter = 'customer' | 'admin' | 'all';

const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: 'customer', label: 'Customers' },
  { value: 'admin', label: 'Admins' },
  { value: 'all', label: 'All accounts' },
];

const isRoleFilter = (value: string | null): value is RoleFilter =>
  ROLE_FILTERS.some((filter) => filter.value === value);

interface Filters {
  search?: string;
  role?: RoleFilter;
  page?: number;
}

/** ?search=anna&role=admin&page=2 (a new filter starts on page 1) */
function adminCustomersHref({ search, role, page }: Filters) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (role && role !== 'customer') params.set('role', role);
  if (page && page > 1) params.set('page', String(page));
  const query = params.toString();
  return `/admin/customers${query ? `?${query}` : ''}`;
}

export function AdminCustomersPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const search = searchParams.get('search')?.trim() || undefined;
  const roleParam = searchParams.get('role');
  const role: RoleFilter = isRoleFilter(roleParam) ? roleParam : 'customer';
  const pageParam = Number(searchParams.get('page'));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const { data, isError, isPlaceholderData, refetch } = useCustomers({
    search,
    role: role === 'all' ? undefined : (role satisfies UserRole),
    page,
    limit: PAGE_SIZE,
  });

  return (
    <section aria-labelledby="admin-customers-title" className="flex flex-col gap-6">
      <title>Customers | Admin | Ecommerce Shop</title>
      <h2 id="admin-customers-title" className="text-lg font-semibold">
        Customers
      </h2>

      <div className="flex flex-wrap items-end gap-4">
        <form
          role="search"
          className="flex flex-1 gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const value = String(new FormData(event.currentTarget).get('search') ?? '').trim();
            navigate(adminCustomersHref({ role, search: value }));
          }}
        >
          <Input
            // A new URL (e.g. back button) resets the field to the search in the URL
            key={search ?? ''}
            name="search"
            type="search"
            defaultValue={search}
            aria-label="Search customers"
            placeholder="Email or name"
            className="max-w-sm"
          />
          <Button type="submit" variant="outline">
            <Search />
            Search
          </Button>
        </form>
        <label className="flex items-center gap-2 text-sm">
          Show
          <select
            value={role}
            onChange={(event) =>
              navigate(adminCustomersHref({ search, role: event.target.value as RoleFilter }))
            }
            className="border-input h-9 rounded-md border bg-transparent px-3 shadow-xs"
          >
            {ROLE_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isError ? (
        <PageStatus title="Customers could not be loaded">
          <Button onClick={() => refetch()}>Try again</Button>
        </PageStatus>
      ) : !data ? (
        <div role="status" aria-label="Loading customers" className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : data.users.length === 0 ? (
        <PageStatus title="No customers found">
          {(search || role !== 'customer') && (
            <Button asChild variant="outline">
              <Link to="/admin/customers">Show all customers</Link>
            </Button>
          )}
        </PageStatus>
      ) : (
        <Table className={isPlaceholderData ? 'opacity-60' : undefined}>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Orders</TableHead>
              <TableHead>Member since</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/admin/customers/${user.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {user.first_name} {user.last_name}
                    </Link>
                    {user.role === 'admin' && <Badge variant="secondary">Admin</Badge>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {user.email}
                    {!user.email_verified_at && <Badge variant="outline">Not verified</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right">{user.order_count}</TableCell>
                <TableCell>
                  <time dateTime={user.created_at}>{formatDate(user.created_at)}</time>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {data && (
        <Pagination
          page={page}
          totalPages={data.pagination.totalPages}
          hrefFor={(target) => adminCustomersHref({ search, role, page: target })}
        />
      )}
    </section>
  );
}
