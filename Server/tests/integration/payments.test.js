import { resetDatabase, closeDatabase } from './helpers/db.js';
import {
  api,
  authHeader,
  createAdmin,
  createProduct,
  createUser,
  shippingAddress,
} from './helpers/factories.js';

beforeEach(resetDatabase);
afterAll(closeDatabase);

describe('Payments', () => {
  let admin;
  let customer;
  let order;

  const recordPayment = (body, token = admin.token, orderId = order.id) =>
    api().post(`/api/orders/${orderId}/payments`).set(authHeader(token)).send(body);

  const getOrder = () => api().get(`/api/orders/${order.id}`).set(authHeader(customer.token));

  beforeEach(async () => {
    admin = await createAdmin();
    const product = await createProduct(admin.token, { stock_quantity: 10 });
    customer = await createUser();

    await api()
      .post('/api/cart/items')
      .set(authHeader(customer.token))
      .send({ productId: product.id, quantity: 1 });
    const res = await api()
      .post('/api/orders')
      .set(authHeader(customer.token))
      // A client claiming to have paid: these fields must be ignored
      .send({ shippingAddress, paymentProvider: 'stripe', paymentId: 'pi_fake' });
    order = res.body.data.order;
  });

  it('ignores payment fields sent by the client at checkout', async () => {
    expect(order.status).toBe('pending');
    expect(order.payments).toEqual([]);
    expect(order).not.toHaveProperty('payment_id');
  });

  it('records the outstanding balance by default and marks the order as paid', async () => {
    const res = await recordPayment({ providerPaymentId: 'SEPA-1' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      payment: {
        provider: 'manual',
        provider_payment_id: 'SEPA-1',
        status: 'succeeded',
        amount_cents: order.total_cents,
        currency: 'EUR',
      },
      orderStatus: 'paid',
      outstandingCents: 0,
    });

    const details = await getOrder();
    expect(details.body.data.order.status).toBe('paid');
    expect(details.body.data.order.payments).toHaveLength(1);
  });

  it('works without a request body', async () => {
    const res = await api().post(`/api/orders/${order.id}/payments`).set(authHeader(admin.token));

    expect(res.status).toBe(201);
    expect(res.body.data.payment.provider).toBe('manual');
  });

  it('keeps the order pending until partial payments cover the total', async () => {
    const first = await recordPayment({ amountCents: 1000 });
    expect(first.body.data).toMatchObject({
      orderStatus: 'pending',
      outstandingCents: order.total_cents - 1000,
    });

    const second = await recordPayment({ amountCents: order.total_cents - 1000 });
    expect(second.body.data.orderStatus).toBe('paid');
  });

  it('rejects an amount above the outstanding balance with 409', async () => {
    const res = await recordPayment({ amountCents: order.total_cents + 1 });

    expect(res.status).toBe(409);
  });

  it('rejects payments for an order that is no longer pending', async () => {
    await recordPayment({});

    const res = await recordPayment({});

    expect(res.status).toBe(409);
  });

  it('rejects the same provider reference twice with 409', async () => {
    await recordPayment({ amountCents: 100, providerPaymentId: 'SEPA-1' });

    const res = await recordPayment({ amountCents: 100, providerPaymentId: 'SEPA-1' });

    expect(res.status).toBe(409);
  });

  it('rejects an invalid provider name with 400', async () => {
    const res = await recordPayment({ provider: 'pay pal!' });

    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown order', async () => {
    const res = await recordPayment({}, admin.token, '00000000-0000-4000-8000-000000000000');

    expect(res.status).toBe(404);
  });

  it('is admin only', async () => {
    const res = await recordPayment({}, customer.token);

    expect(res.status).toBe(403);
  });
});
