import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { AdminOrder } from '@/features/admin-orders/types';
import { buildAdminOrder, buildPayment } from '@/test/fixtures';
import { fail, mockApi, ok, sequence } from '@/test/mock-api';
import { buildUser, renderRoute } from '@/test/render';

const ORDER_URL = '/admin/orders/ORD-2026-000042';
const pending = buildAdminOrder();
const paid = buildAdminOrder({
  status: 'paid',
  payments: [buildPayment({ provider: 'bank_transfer', provider_payment_id: 'STMT-7' })],
});

const withOrder = (order: ReturnType<typeof sequence> | ReturnType<typeof ok>, extra = {}) =>
  mockApi({
    'GET /users/me': ok({ user: buildUser({ role: 'admin' }) }),
    'GET /orders/ORD-2026-000042': order,
    'GET /orders/all': ok({
      orders: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    }),
    ...extra,
  });

const bodyOf = (fetchMock: ReturnType<typeof mockApi>, method: string, path: string) => {
  const call = fetchMock.mock.calls.find(
    ([url, init]) => url === `/api${path}` && init?.method === method
  );
  return call ? JSON.parse(call[1]?.body as string) : undefined;
};

const nextSteps = () => screen.getByRole('region', { name: 'Next steps' });

describe('admin order detail', () => {
  it('shows the customer, the outstanding amount and only the allowed steps', async () => {
    withOrder(ok({ order: pending }));
    renderRoute(ORDER_URL);

    const customer = await screen.findByRole('region', { name: 'Customer' });
    expect(customer).toHaveTextContent('Anna Schmidt');
    expect(within(customer).getByRole('link', { name: 'anna@example.com' })).toHaveAttribute(
      'href',
      'mailto:anna@example.com'
    );
    expect(screen.getByText(/Paid €0.00 of €50.00/)).toHaveTextContent('Outstanding €50.00');
    // "paid" is only reached by recording a payment, not by a button
    expect(
      within(nextSteps())
        .getAllByRole('button')
        .map((b) => b.textContent)
    ).toEqual(['Cancel order']);
  });

  it('records the whole outstanding amount as bank transfer', async () => {
    const fetchMock = withOrder(sequence(ok({ order: pending }), ok({ order: paid })), {
      'POST /orders/o0000000-0000-4000-8000-000000000001/payments': ok(),
    });
    renderRoute(ORDER_URL);

    const amount = await screen.findByLabelText('Amount (EUR)');
    expect(amount).toHaveValue('50.00');
    await userEvent.type(screen.getByLabelText('Bank reference (optional)'), 'STMT-7');
    await userEvent.click(screen.getByRole('button', { name: 'Record payment' }));

    expect(await screen.findByText('Payment recorded. The order is paid.')).toBeInTheDocument();
    expect(
      bodyOf(fetchMock, 'POST', '/orders/o0000000-0000-4000-8000-000000000001/payments')
    ).toEqual({ provider: 'bank_transfer', providerPaymentId: 'STMT-7', amountCents: 5000 });
    // Reloaded: paid now, the next step is processing and the form is gone
    expect(await screen.findByRole('button', { name: 'Start processing' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Amount (EUR)')).not.toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'STMT-7' })).toBeInTheDocument();
  });

  it('accepts partial payments but not more than outstanding', async () => {
    const fetchMock = withOrder(ok({ order: pending }));
    renderRoute(ORDER_URL);

    const amount = await screen.findByLabelText('Amount (EUR)');
    await userEvent.clear(amount);
    await userEvent.type(amount, '60');
    await userEvent.click(screen.getByRole('button', { name: 'Record payment' }));
    expect(await screen.findByText('At most the outstanding €50.00')).toBeInTheDocument();

    await userEvent.clear(amount);
    await userEvent.type(amount, '12.345');
    await userEvent.click(screen.getByRole('button', { name: 'Record payment' }));
    expect(await screen.findByText('Enter an amount like 19.99')).toBeInTheDocument();

    expect(bodyOf(fetchMock, 'POST', '/orders/o0000000-0000-4000-8000-000000000001/payments')).toBe(
      undefined
    );
  });

  it('changes the status after confirming, with an internal note', async () => {
    const processing = buildAdminOrder({
      ...paid,
      status: 'processing',
      status_history: [
        ...paid.status_history,
        {
          id: 'h-9',
          from_status: 'paid',
          to_status: 'processing',
          changed_by: 'admin-1',
          note: 'Packed by Tom',
          created_at: '2026-10-04T08:00:00.000Z',
        },
      ],
    });
    const fetchMock = withOrder(ok({ order: paid }), {
      'PATCH /orders/o0000000-0000-4000-8000-000000000001/status': ok({ order: processing }),
    });
    renderRoute(ORDER_URL);

    await userEvent.click(await screen.findByRole('button', { name: 'Start processing' }));
    const dialog = await screen.findByRole('dialog', { name: 'Start processing?' });
    await userEvent.type(
      within(dialog).getByLabelText('Internal note (optional)'),
      'Packed by Tom'
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Start processing' }));

    expect(await screen.findByText('Order ORD-2026-000042: Processing')).toBeInTheDocument();
    expect(
      bodyOf(fetchMock, 'PATCH', '/orders/o0000000-0000-4000-8000-000000000001/status')
    ).toEqual({ status: 'processing', note: 'Packed by Tom' });
    // The response is the updated order: new steps and the note in the history
    expect(
      within(nextSteps()).getByRole('button', { name: 'Mark as shipped' })
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'History' })).toHaveTextContent('Packed by Tom');
  });

  it('shows a refused status change inside the dialog', async () => {
    withOrder(ok({ order: pending }), {
      'PATCH /orders/o0000000-0000-4000-8000-000000000001/status': fail(
        409,
        'Cannot change order status from "paid" to "cancelled"'
      ),
    });
    renderRoute(ORDER_URL);

    await userEvent.click(await screen.findByRole('button', { name: 'Cancel order' }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(/go back into stock/i);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel order' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      /cannot change order status/i
    );
  });

  it('has no steps and no payment form for closed orders', async () => {
    withOrder(ok({ order: buildAdminOrder({ status: 'cancelled' }) as AdminOrder }));
    renderRoute(ORDER_URL);

    expect(await screen.findByText('This order is closed.')).toBeInTheDocument();
    expect(screen.queryByLabelText('Amount (EUR)')).not.toBeInTheDocument();
  });

  it('shows a not found page for unknown order numbers', async () => {
    withOrder(fail(404, 'Order not found'));
    renderRoute(ORDER_URL);

    expect(await screen.findByRole('heading', { name: 'Order not found' })).toBeInTheDocument();
  });
});
