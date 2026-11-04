import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { AdminOrderSummary } from '@/features/admin-orders/types';
import { buildAdminOrderSummary } from '@/test/fixtures';
import { mockApi, ok } from '@/test/mock-api';
import { buildUser, renderRoute } from '@/test/render';

const asAdmin = { 'GET /users/me': ok({ user: buildUser({ role: 'admin' }) }) };

const orderList = (orders: AdminOrderSummary[]) =>
  ok({ orders, pagination: { page: 1, limit: 20, total: orders.length, totalPages: 1 } });

/** Query strings of all requests to the admin order list */
const listQueries = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.startsWith('/api/orders/all?'))
    .map((url) => new URLSearchParams(url.split('?')[1]));

describe('admin order list', () => {
  it('shows every order with its customer and links to the details', async () => {
    mockApi({
      ...asAdmin,
      'GET /orders/all': orderList([buildAdminOrderSummary({ status: 'paid' })]),
    });
    renderRoute('/admin/orders');

    const link = await screen.findByRole('link', { name: 'ORD-2026-000042' });
    expect(link).toHaveAttribute('href', '/admin/orders/ORD-2026-000042');
    const row = link.closest('tr')!;
    expect(row).toHaveTextContent('Anna Schmidt');
    expect(row).toHaveTextContent('anna@example.com');
    expect(row).toHaveTextContent('Paid');
    expect(row).toHaveTextContent('€50.00');
  });

  it('searches and filters via the URL', async () => {
    const fetchMock = mockApi({ ...asAdmin, 'GET /orders/all': orderList([]) });
    const { router } = renderRoute('/admin/orders');

    const search = await screen.findByRole('searchbox', { name: 'Search orders' });
    await userEvent.type(search, 'anna');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'pending');

    await waitFor(() => expect(router.state.location.search).toBe('?status=pending&search=anna'));
    const last = listQueries(fetchMock).at(-1)!;
    expect(last.get('search')).toBe('anna');
    expect(last.get('status')).toBe('pending');
  });

  it('offers to reset the filters when nothing matches', async () => {
    mockApi({ ...asAdmin, 'GET /orders/all': orderList([]) });
    renderRoute('/admin/orders?search=nobody');

    expect(await screen.findByRole('heading', { name: 'No orders found' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toHaveValue('nobody');
    expect(
      within(screen.getByRole('main')).getByRole('link', { name: 'Show all orders' })
    ).toHaveAttribute('href', '/admin/orders');
  });
});
