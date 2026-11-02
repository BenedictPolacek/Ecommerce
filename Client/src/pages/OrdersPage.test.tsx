import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { OrderSummary } from '@/features/orders/types';
import { formatDate } from '@/lib/format';
import { buildOrder, buildOrderSummary, buildPayment } from '@/test/fixtures';
import { fail, mockApi, ok } from '@/test/mock-api';
import { buildUser, renderRoute } from '@/test/render';

const loggedIn = { 'GET /users/me': ok({ user: buildUser() }) };

const orderList = (orders: OrderSummary[], page = 1, totalPages = 1) =>
  ok({ orders, pagination: { page, limit: 10, total: orders.length, totalPages } });

const listRequests = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.startsWith('/api/orders?'));

describe('my orders', () => {
  it('lists the orders with date, items, status and total', async () => {
    const fetchMock = mockApi({
      ...loggedIn,
      'GET /orders': orderList([
        buildOrderSummary(),
        buildOrderSummary({
          id: 'o2',
          order_number: 'ORD-2026-000041',
          status: 'shipped',
          item_count: 1,
          total_cents: 1299,
        }),
      ]),
    });
    renderRoute('/orders');

    const link = await screen.findByRole('link', { name: 'ORD-2026-000042' });
    expect(link).toHaveAttribute('href', '/orders/ORD-2026-000042');
    const first = link.closest('li')!;
    expect(within(first).getByText('Awaiting payment')).toBeInTheDocument();
    expect(within(first).getByText('€50.00')).toBeInTheDocument();
    expect(first).toHaveTextContent(`${formatDate('2026-10-01T10:00:00.000Z')} · 2 items`);

    const second = screen.getByRole('link', { name: 'ORD-2026-000041' }).closest('li')!;
    expect(within(second).getByText('Shipped')).toBeInTheDocument();
    expect(second).toHaveTextContent('1 item');

    expect(listRequests(fetchMock)).toEqual(['/api/orders?page=1&limit=10']);
  });

  it('is linked in the header', async () => {
    mockApi({ ...loggedIn, 'GET /orders': orderList([]) });
    const { router } = renderRoute('/');

    await userEvent.click(await screen.findByRole('link', { name: 'Orders' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/orders'));
  });

  it('invites to shop when there are no orders', async () => {
    mockApi({ ...loggedIn, 'GET /orders': orderList([]) });
    renderRoute('/orders');

    expect(
      await screen.findByRole('heading', { name: 'You have no orders yet' })
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Start shopping' })).toHaveAttribute('href', '/');
  });

  it('filters by status through the URL', async () => {
    const fetchMock = mockApi({ ...loggedIn, 'GET /orders': orderList([buildOrderSummary()]) });
    const { router } = renderRoute('/orders?page=2');

    await screen.findByRole('link', { name: 'ORD-2026-000042' });
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'Shipped');

    await waitFor(() => expect(router.state.location.search).toBe('?status=shipped'));
    await waitFor(() =>
      expect(listRequests(fetchMock)).toContain('/api/orders?page=1&limit=10&status=shipped')
    );
  });

  it('ignores an unknown status in the URL', async () => {
    const fetchMock = mockApi({ ...loggedIn, 'GET /orders': orderList([buildOrderSummary()]) });
    renderRoute('/orders?status=lost');

    await screen.findByRole('link', { name: 'ORD-2026-000042' });
    expect(listRequests(fetchMock)).toEqual(['/api/orders?page=1&limit=10']);
  });

  it('keeps the status filter in the pagination links', async () => {
    mockApi({ ...loggedIn, 'GET /orders': orderList([buildOrderSummary()], 1, 3) });
    renderRoute('/orders?status=pending');

    const pagination = await screen.findByRole('navigation', { name: 'Pagination' });
    expect(within(pagination).getByRole('link', { name: 'Page 2' })).toHaveAttribute(
      'href',
      '/orders?status=pending&page=2'
    );
  });
});

describe('order detail', () => {
  it('shows bank details, items, addresses and the history of a pending order', async () => {
    mockApi({ ...loggedIn, 'GET /orders/ORD-2026-000042': ok({ order: buildOrder() }) });
    renderRoute('/orders/ORD-2026-000042');

    expect(
      await screen.findByRole('heading', { name: 'Order ORD-2026-000042' })
    ).toBeInTheDocument();
    expect(screen.getAllByText('Awaiting payment').length).toBeGreaterThan(0);
    expect(screen.getByRole('region', { name: 'Please transfer €50.00' })).toBeInTheDocument();
    expect(screen.getByText('2 × Desk Lamp')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Shipping address' })).toHaveTextContent(
      'Hauptstrasse 1'
    );
    expect(screen.getByRole('region', { name: 'Billing address' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'History' })).toBeInTheDocument();
  });

  it('asks only for the rest after a partial payment', async () => {
    const order = buildOrder({ payments: [buildPayment({ amount_cents: 2000 })] });
    mockApi({ ...loggedIn, 'GET /orders/ORD-2026-000042': ok({ order }) });
    renderRoute('/orders/ORD-2026-000042');

    expect(await screen.findByText('We have received €20.00 of €50.00.')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Please transfer €30.00' })).toBeInTheDocument();
  });

  it('shows no bank details once the order is paid, newest status first', async () => {
    const order = buildOrder({
      status: 'shipped',
      payments: [buildPayment()],
      status_history: [
        { from_status: null, to_status: 'pending', created_at: '2026-10-01T10:00:00.000Z' },
        { from_status: 'pending', to_status: 'paid', created_at: '2026-10-03T09:00:00.000Z' },
        { from_status: 'paid', to_status: 'shipped', created_at: '2026-10-04T15:00:00.000Z' },
      ],
    });
    mockApi({ ...loggedIn, 'GET /orders/ORD-2026-000042': ok({ order }) });
    renderRoute('/orders/ORD-2026-000042');

    expect(await screen.findByText(/your order is on its way/i)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /please transfer/i })).not.toBeInTheDocument();

    const steps = within(screen.getByRole('region', { name: 'History' })).getAllByRole('listitem');
    expect(steps.map((step) => step.firstChild?.textContent)).toEqual([
      'Shipped',
      'Paid',
      'Awaiting payment',
    ]);
  });

  it('shows "not found" for unknown orders and orders of other customers', async () => {
    mockApi({ ...loggedIn, 'GET /orders/ORD-2026-999999': fail(404, 'Order not found') });
    renderRoute('/orders/ORD-2026-999999');

    expect(await screen.findByRole('heading', { name: 'Order not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to your orders' })).toHaveAttribute(
      'href',
      '/orders'
    );
  });
});
