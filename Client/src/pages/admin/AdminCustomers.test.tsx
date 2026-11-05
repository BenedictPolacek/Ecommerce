import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Customer, CustomerSummary } from '@/features/admin-customers/types';
import { buildAdminOrder, buildAdminOrderSummary } from '@/test/fixtures';
import { fail, mockApi, ok } from '@/test/mock-api';
import { buildUser, renderRoute } from '@/test/render';

const ANNA_ID = 'a0000000-0000-4000-8000-000000000001';
const admin = buildUser({ role: 'admin' });

const annaUser = buildUser({
  id: ANNA_ID,
  email: 'anna@example.com',
  first_name: 'Anna',
  last_name: 'Schmidt',
});

const anna: Customer = {
  ...annaUser,
  stats: { order_count: 2, spent_cents: 4999, last_order_at: '2026-11-04T10:00:00.000Z' },
};

const summary = (overrides: Partial<CustomerSummary> = {}): CustomerSummary => ({
  ...annaUser,
  order_count: 2,
  ...overrides,
});

const customerList = (users: CustomerSummary[]) =>
  ok({ users, pagination: { page: 1, limit: 20, total: users.length, totalPages: 1 } });

const orderList = (total: number) =>
  ok({
    orders: [buildAdminOrderSummary({ status: 'delivered' })],
    pagination: { page: 1, limit: 10, total, totalPages: 1 },
  });

const asAdmin = (extra: Parameters<typeof mockApi>[0] = {}) =>
  mockApi({ 'GET /users/me': ok({ user: admin }), ...extra });

/** Query of the last request to the given path */
const lastQuery = (fetchMock: ReturnType<typeof mockApi>, path: string) => {
  const url = fetchMock.mock.calls
    .map(([u]) => String(u))
    .filter((u) => u.startsWith(`/api${path}?`))
    .at(-1);
  return new URLSearchParams(url?.split('?')[1]);
};

describe('customer list', () => {
  it('lists customers by default, with their orders and unverified emails', async () => {
    const fetchMock = asAdmin({
      'GET /users': customerList([
        summary(),
        summary({ id: 'b2', first_name: 'Max', email_verified_at: null, order_count: 0 }),
      ]),
    });
    renderRoute('/admin/customers');

    const table = await screen.findByRole('table');
    const [, annaRow, maxRow] = within(table).getAllByRole('row');
    expect(within(annaRow).getByRole('link', { name: 'Anna Schmidt' })).toHaveAttribute(
      'href',
      `/admin/customers/${ANNA_ID}`
    );
    expect(annaRow).toHaveTextContent('2');
    expect(maxRow).toHaveTextContent('Not verified');
    expect(lastQuery(fetchMock, '/users').get('role')).toBe('customer');
  });

  it('puts search and role into the URL; "All accounts" sends no role', async () => {
    const fetchMock = asAdmin({ 'GET /users': customerList([summary({ role: 'admin' })]) });
    const { router } = renderRoute('/admin/customers');

    await userEvent.type(await screen.findByLabelText('Search customers'), 'anna');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => expect(router.state.location.search).toBe('?search=anna'));

    await userEvent.selectOptions(screen.getByLabelText('Show'), 'admin');
    await waitFor(() => expect(router.state.location.search).toBe('?search=anna&role=admin'));
    await waitFor(() => expect(lastQuery(fetchMock, '/users').get('role')).toBe('admin'));
    expect(lastQuery(fetchMock, '/users').get('search')).toBe('anna');
    expect(within(await screen.findByRole('table')).getByText('Admin')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Show'), 'all');
    await waitFor(() => expect(router.state.location.search).toBe('?search=anna&role=all'));
    await waitFor(() => expect(lastQuery(fetchMock, '/users').has('role')).toBe(false));
  });
});

describe('customer detail', () => {
  const openAnna = (extra: Parameters<typeof mockApi>[0] = {}) => {
    const fetchMock = asAdmin({
      [`GET /users/${ANNA_ID}`]: ok({ user: anna }),
      'GET /orders/all': orderList(2),
      ...extra,
    });
    const result = renderRoute(`/admin/customers/${ANNA_ID}`);
    return { fetchMock, ...result };
  };

  it('shows the figures and the orders of this customer', async () => {
    const { fetchMock } = openAnna();

    expect(await screen.findByRole('heading', { name: 'Anna Schmidt' })).toBeInTheDocument();
    expect(screen.getByText('€49.99')).toBeInTheDocument();
    const orders = await screen.findByRole('table', { name: 'Orders of this customer' });
    expect(within(orders).getByRole('link', { name: 'ORD-2026-000042' })).toHaveAttribute(
      'href',
      '/admin/orders/ORD-2026-000042'
    );
    expect(lastQuery(fetchMock, '/orders/all').get('user_id')).toBe(ANNA_ID);
    // Only 2 orders: no hint to search for more
    expect(screen.queryByText(/search all orders/i)).not.toBeInTheDocument();
  });

  it('links to the order search when there are more orders than shown', async () => {
    openAnna({ 'GET /orders/all': orderList(25) });

    expect(await screen.findByRole('link', { name: 'Search all orders by email' })).toHaveAttribute(
      'href',
      '/admin/orders?search=anna%40example.com'
    );
  });

  it('deletes the customer after confirmation and goes back to the list', async () => {
    const { fetchMock, router } = openAnna({
      [`DELETE /users/${ANNA_ID}`]: ok(),
      'GET /users': customerList([]),
    });

    await userEvent.click(await screen.findByRole('button', { name: 'Delete customer' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete Anna Schmidt?' });
    // With orders the customer is anonymized, the orders stay
    expect(dialog).toHaveTextContent(/orders stay with an anonymized customer/);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Anna Schmidt deleted')).toBeInTheDocument();
    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/customers'));
    expect(
      fetchMock.mock.calls.some(
        ([u, init]) => u === `/api/users/${ANNA_ID}` && init?.method === 'DELETE'
      )
    ).toBe(true);
  });

  it('explains why a customer with open orders cannot be deleted', async () => {
    const { router } = openAnna({
      [`DELETE /users/${ANNA_ID}`]: fail(
        409,
        'There are still open orders. The account can be deleted once they are completed.'
      ),
    });

    await userEvent.click(await screen.findByRole('button', { name: 'Delete customer' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText(/still open orders/)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/admin/customers/${ANNA_ID}`);
  });

  it('has no delete button for admin accounts', async () => {
    openAnna({ [`GET /users/${ANNA_ID}`]: ok({ user: { ...anna, role: 'admin' } }) });

    expect(await screen.findByText('Admin accounts cannot be deleted here.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete customer' })).not.toBeInTheDocument();
  });

  it('shows "not found" for deleted or unknown customers', async () => {
    openAnna({ [`GET /users/${ANNA_ID}`]: fail(404, 'User not found') });

    expect(await screen.findByText('Customer not found')).toBeInTheDocument();
  });
});

describe('customer on the admin order page', () => {
  const openOrder = (customer: ReturnType<typeof buildAdminOrder>['customer']) => {
    asAdmin({
      'GET /orders/ORD-2026-000042': ok({ order: buildAdminOrder({ customer }) }),
    });
    renderRoute('/admin/orders/ORD-2026-000042');
  };

  it('links to the customer page', async () => {
    openOrder({ id: ANNA_ID, email: 'anna@example.com', first_name: 'Anna', last_name: 'Schmidt' });

    expect(await screen.findByRole('link', { name: 'Anna Schmidt' })).toHaveAttribute(
      'href',
      `/admin/customers/${ANNA_ID}`
    );
  });

  it('shows anonymized customers without a link', async () => {
    openOrder({
      id: ANNA_ID,
      email: `deleted-${ANNA_ID}@deleted.invalid`,
      first_name: 'Deleted',
      last_name: 'User',
    });

    expect(await screen.findByText('Deleted User')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Deleted User' })).not.toBeInTheDocument();
  });
});
