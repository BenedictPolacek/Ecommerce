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

describe('Stock movements', () => {
  let admin;
  let customer;
  let product;

  const history = (productId = product.id, token = admin.token) =>
    api().get(`/api/products/${productId}/stock-movements`).set(authHeader(token));

  const record = (body, token = admin.token) =>
    api().post(`/api/products/${product.id}/stock-movements`).set(authHeader(token)).send(body);

  const stockOf = async (productId = product.id) => {
    const { rows } = await query('SELECT stock_quantity FROM products WHERE id = $1', [productId]);
    return rows[0].stock_quantity;
  };

  // The invariant of the ledger: the movements always add up to the current stock
  const ledgerSum = async (productId = product.id) => {
    const { rows } = await query(
      'SELECT COALESCE(SUM(quantity), 0)::int AS sum FROM stock_movements WHERE product_id = $1',
      [productId]
    );
    return rows[0].sum;
  };

  const placeOrder = async (quantity) => {
    await api()
      .post('/api/cart/items')
      .set(authHeader(customer.token))
      .send({ productId: product.id, quantity });
    const res = await api()
      .post('/api/orders')
      .set(authHeader(customer.token))
      .send({ shippingAddress });
    return res.body.data.order;
  };

  const setStatus = (order, status) =>
    api().patch(`/api/orders/${order.id}/status`).set(authHeader(admin.token)).send({ status });

  beforeEach(async () => {
    admin = await createAdmin();
    customer = await createUser();
    product = await createProduct(admin.token, { stock_quantity: 10 });
  });

  it('books the opening stock of a new product as "initial"', async () => {
    const res = await history();

    expect(res.status).toBe(200);
    expect(res.body.data.movements).toEqual([
      expect.objectContaining({
        reason: 'initial',
        quantity: 10,
        balance_after: 10,
        created_by: admin.user.id,
      }),
    ]);
  });

  it('creates no movement for a product without stock', async () => {
    const empty = await createProduct(admin.token, { name: 'Empty', stock_quantity: 0 });

    const res = await history(empty.id);

    expect(res.body.data.movements).toEqual([]);
  });

  it('books a checkout as "sale" with the order number', async () => {
    const order = await placeOrder(3);

    const res = await history();

    expect(res.body.data.movements[0]).toMatchObject({
      reason: 'sale',
      quantity: -3,
      balance_after: 7,
      order_id: order.id,
      order_number: order.order_number,
      created_by: customer.user.id,
    });
    expect(await ledgerSum()).toBe(await stockOf());
  });

  describe('cancellation', () => {
    it('puts the stock back once', async () => {
      const order = await placeOrder(3);

      await setStatus(order, 'cancelled');
      // Repeating the same status must not book the stock back a second time
      await setStatus(order, 'cancelled');

      expect(await stockOf()).toBe(10);
      const res = await history();
      expect(res.body.data.movements[0]).toMatchObject({
        reason: 'order_cancelled',
        quantity: 3,
        order_id: order.id,
      });
      expect(res.body.data.pagination.total).toBe(3);
      expect(await ledgerSum()).toBe(10);
    });

    it('is final: a cancelled order cannot change its status again', async () => {
      const order = await placeOrder(1);
      await setStatus(order, 'cancelled');

      const res = await setStatus(order, 'processing');

      expect(res.status).toBe(409);
    });

    it('does not put stock back for other statuses', async () => {
      const order = await placeOrder(2);
      await api().post(`/api/orders/${order.id}/payments`).set(authHeader(admin.token)).send({});

      await setStatus(order, 'refunded');

      expect(await stockOf()).toBe(8);
    });
  });

  describe('POST /products/:id/stock-movements', () => {
    it('records a restock', async () => {
      const res = await record({ reason: 'restock', quantity: 50, note: 'Delivery #42' });

      expect(res.status).toBe(201);
      expect(res.body.data.movement).toMatchObject({
        reason: 'restock',
        quantity: 50,
        balance_after: 60,
        note: 'Delivery #42',
      });
      expect(await stockOf()).toBe(60);
    });

    it('records damage as a negative quantity', async () => {
      const res = await record({ reason: 'damage', quantity: -2 });

      expect(res.status).toBe(201);
      expect(await stockOf()).toBe(8);
    });

    it.each([
      [{ reason: 'restock', quantity: -5 }, 'negative restock'],
      [{ reason: 'damage', quantity: 5 }, 'positive damage'],
      [{ reason: 'adjustment', quantity: 0 }, 'zero quantity'],
      [{ reason: 'sale', quantity: -1 }, 'system-only reason'],
      [{ reason: 'restock', quantity: 1.5 }, 'fractional quantity'],
    ])('rejects %j (%s) with 400', async (body) => {
      const res = await record(body);

      expect(res.status).toBe(400);
    });

    it('rejects going below 0 with 409 and leaves the stock unchanged', async () => {
      const res = await record({ reason: 'adjustment', quantity: -11 });

      expect(res.status).toBe(409);
      expect(await stockOf()).toBe(10);
    });
  });

  describe('PATCH /products/:id/stock (inventory count)', () => {
    it('logs the difference as an adjustment', async () => {
      const res = await api()
        .patch(`/api/products/${product.id}/stock`)
        .set(authHeader(admin.token))
        .send({ stock_quantity: 7, note: 'Inventory 2026' });

      expect(res.status).toBe(200);
      expect(res.body.data.stock_quantity).toBe(7);
      const movements = (await history()).body.data.movements;
      expect(movements[0]).toMatchObject({ reason: 'adjustment', quantity: -3, balance_after: 7 });
    });

    it('creates no movement when the count matches', async () => {
      await api()
        .patch(`/api/products/${product.id}/stock`)
        .set(authHeader(admin.token))
        .send({ stock_quantity: 10 });

      expect((await history()).body.data.pagination.total).toBe(1);
    });
  });

  it('rejects stock_quantity in PUT /products/:id', async () => {
    const res = await api()
      .put(`/api/products/${product.id}`)
      .set(authHeader(admin.token))
      .send({ stock_quantity: 99 });

    expect(res.status).toBe(400);
    expect(await stockOf()).toBe(10);
  });

  it('is append-only: the database refuses to change history', async () => {
    await expect(query('UPDATE stock_movements SET quantity = 999')).rejects.toThrow(/append-only/);
    await expect(query('DELETE FROM stock_movements')).rejects.toThrow(/append-only/);
  });

  it('keeps the history admin only', async () => {
    const res = await history(product.id, customer.token);

    expect(res.status).toBe(403);
  });

  it('returns 404 for an unknown product', async () => {
    const res = await history('00000000-0000-4000-8000-000000000000');

    expect(res.status).toBe(404);
  });
});
