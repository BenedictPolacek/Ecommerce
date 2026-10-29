import { resetDatabase, closeDatabase, query } from './helpers/db.js';
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

describe('Order status history', () => {
  let admin;
  let customer;
  let order;

  const setStatus = (status, note) =>
    api()
      .patch(`/api/orders/${order.id}/status`)
      .set(authHeader(admin.token))
      .send({ status, note });

  const pay = () =>
    api().post(`/api/orders/${order.id}/payments`).set(authHeader(admin.token)).send({});

  const getOrder = (token) => api().get(`/api/orders/${order.id}`).set(authHeader(token));

  const historyRows = async () => {
    const { rows } = await query(
      'SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at, id',
      [order.id]
    );
    return rows;
  };

  beforeEach(async () => {
    admin = await createAdmin();
    customer = await createUser();
    const product = await createProduct(admin.token, { stock_quantity: 10 });
    await api()
      .post('/api/cart/items')
      .set(authHeader(customer.token))
      .send({ productId: product.id, quantity: 1 });
    const res = await api()
      .post('/api/orders')
      .set(authHeader(customer.token))
      .send({ shippingAddress });
    order = res.body.data.order;
  });

  it('starts with a pending entry created by the customer', async () => {
    expect(order.status_history).toEqual([
      expect.objectContaining({ from_status: null, to_status: 'pending' }),
    ]);
    const [entry] = await historyRows();
    expect(entry.changed_by).toBe(customer.user.id);
  });

  it('records the whole lifecycle in order', async () => {
    await pay();
    await setStatus('processing');
    await setStatus('shipped', 'DHL 0034');
    await setStatus('delivered');

    const res = await getOrder(admin.token);

    expect(res.body.data.order.status).toBe('delivered');
    expect(res.body.data.order.status_history.map((h) => [h.from_status, h.to_status])).toEqual([
      [null, 'pending'],
      ['pending', 'paid'],
      ['paid', 'processing'],
      ['processing', 'shipped'],
      ['shipped', 'delivered'],
    ]);
  });

  it('records the admin who recorded the payment as the one who set paid', async () => {
    await pay();

    const rows = await historyRows();
    expect(rows[1]).toMatchObject({ to_status: 'paid', changed_by: admin.user.id });
  });

  it('shows admins who changed it and the note, customers only the timeline', async () => {
    await setStatus('cancelled', 'Customer called');

    const asAdmin = (await getOrder(admin.token)).body.data.order.status_history[1];
    const asCustomer = (await getOrder(customer.token)).body.data.order.status_history[1];

    expect(asAdmin).toMatchObject({
      to_status: 'cancelled',
      changed_by: admin.user.id,
      note: 'Customer called',
    });
    expect(Object.keys(asCustomer).sort()).toEqual(['created_at', 'from_status', 'to_status']);
  });

  it('rejects a transition that is not allowed with 409 and records nothing', async () => {
    const res = await setStatus('shipped');

    expect(res.status).toBe(409);
    expect(await historyRows()).toHaveLength(1);
  });

  it.each(['paid', 'pending'])('does not let admins set "%s" directly (400)', async (status) => {
    const res = await setStatus(status);

    expect(res.status).toBe(400);
  });

  it('treats the same status again as a no-op without a history entry', async () => {
    await setStatus('cancelled');

    const res = await setStatus('cancelled');

    expect(res.status).toBe(200);
    expect(await historyRows()).toHaveLength(2);
  });

  it('allows cancelling a paid order and puts the stock back', async () => {
    await pay();

    const res = await setStatus('cancelled', 'Refunded manually via bank transfer');

    expect(res.status).toBe(200);
    expect(res.body.data.order.status).toBe('cancelled');
  });

  it('is append-only: the database refuses to change history', async () => {
    await expect(query('UPDATE order_status_history SET note = $1', ['x'])).rejects.toThrow(
      /append-only/
    );
    await expect(query('DELETE FROM order_status_history')).rejects.toThrow(/append-only/);
  });
});
