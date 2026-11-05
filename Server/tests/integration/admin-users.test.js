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

const MISSING_ID = '00000000-0000-4000-8000-000000000000';

let admin;
let product;
beforeEach(async () => {
  admin = await createAdmin();
  product = await createProduct(admin.token, { stock_quantity: 100 });
});

const asAdmin = (path) => api().get(`/api${path}`).set(authHeader(admin.token));

const placeOrder = async (customer) => {
  await api()
    .post('/api/cart/items')
    .set(authHeader(customer.token))
    .send({ productId: product.id, quantity: 1 });
  const res = await api()
    .post('/api/orders')
    .set(authHeader(customer.token))
    .send({ shippingAddress });
  return res.body.data.order;
};

const setStatus = (order, status) =>
  query('UPDATE orders SET status = $1 WHERE id = $2', [status, order.id]);

describe('GET /users (admin)', () => {
  it('lists users newest first with their number of orders, without secrets', async () => {
    const anna = await createUser({ first_name: 'Anna', last_name: 'Schmidt' });
    const max = await createUser({ first_name: 'Max', last_name: 'Muster' });
    await placeOrder(anna);

    const res = await asAdmin('/users?role=customer');

    expect(res.status).toBe(200);
    expect(res.body.data.users.map((u) => u.id)).toEqual([max.user.id, anna.user.id]);
    expect(res.body.data.users[1]).toMatchObject({
      email: anna.user.email,
      first_name: 'Anna',
      role: 'customer',
      order_count: 1,
    });
    expect(res.body.data.users[1]).not.toHaveProperty('password_hash');
    expect(res.body.data.pagination).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
  });

  it('filters by role; without a role it lists every account', async () => {
    await createUser();

    const admins = await asAdmin('/users?role=admin');
    const all = await asAdmin('/users');

    expect(admins.body.data.users.map((u) => u.id)).toEqual([admin.user.id]);
    expect(all.body.data.pagination.total).toBe(2);
  });

  it('searches by part of the email or the full name', async () => {
    const anna = await createUser({
      email: 'anna.s@example.com',
      first_name: 'Anna',
      last_name: 'Schmidt',
    });
    await createUser({ email: 'max@example.com', first_name: 'Max', last_name: 'Muster' });

    for (const search of ['ANNA.S@', 'anna schm', 'Schmidt']) {
      const res = await asAdmin(`/users?search=${encodeURIComponent(search)}`);
      expect(res.body.data.users.map((u) => u.id)).toEqual([anna.user.id]);
    }
  });

  it('matches % and _ literally', async () => {
    await createUser({ email: 'plain@example.com' });

    const res = await asAdmin(`/users?search=${encodeURIComponent('%')}`);

    expect(res.status).toBe(200);
    expect(res.body.data.users).toEqual([]);
  });

  it('leaves out deleted (anonymized) users', async () => {
    const customer = await createUser();
    const order = await placeOrder(customer);
    await setStatus(order, 'delivered');
    await api().delete(`/api/users/${customer.user.id}`).set(authHeader(admin.token));

    const res = await asAdmin('/users?role=customer');

    expect(res.body.data.users).toEqual([]);
  });

  it('pages through the users', async () => {
    const oldest = await createUser();
    await createUser();
    await createUser();

    const res = await asAdmin('/users?role=customer&limit=2&page=2');

    // Newest first: page 2 holds the oldest one
    expect(res.body.data.users.map((u) => u.id)).toEqual([oldest.user.id]);
    expect(res.body.data.pagination).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  it('rejects an unknown role', async () => {
    const res = await asAdmin('/users?role=owner');

    expect(res.status).toBe(400);
  });

  it('is only for admins', async () => {
    const customer = await createUser();

    const res = await api().get('/api/users').set(authHeader(customer.token));

    expect(res.status).toBe(403);
  });
});

describe('GET /users/:id (admin)', () => {
  it('returns the user with order figures; only paid orders count as spent', async () => {
    const customer = await createUser();
    const delivered = await placeOrder(customer);
    const cancelled = await placeOrder(customer);
    const pending = await placeOrder(customer);
    await setStatus(delivered, 'delivered');
    await setStatus(cancelled, 'cancelled');

    const res = await asAdmin(`/users/${customer.user.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({
      id: customer.user.id,
      email: customer.user.email,
      stats: { order_count: 3, spent_cents: delivered.total_cents },
    });
    expect(new Date(res.body.data.user.stats.last_order_at).getTime()).toBe(
      new Date(pending.created_at).getTime()
    );
    expect(res.body.data.user).not.toHaveProperty('password_hash');
  });

  it('has zero figures for a user without orders', async () => {
    const customer = await createUser();

    const res = await asAdmin(`/users/${customer.user.id}`);

    expect(res.body.data.user.stats).toEqual({
      order_count: 0,
      spent_cents: 0,
      last_order_at: null,
    });
  });

  it('does not find deleted or unknown users, and checks the id', async () => {
    const customer = await createUser();
    const order = await placeOrder(customer);
    await setStatus(order, 'delivered');
    await api().delete(`/api/users/${customer.user.id}`).set(authHeader(admin.token));

    expect((await asAdmin(`/users/${customer.user.id}`)).status).toBe(404);
    expect((await asAdmin(`/users/${MISSING_ID}`)).status).toBe(404);
    expect((await asAdmin('/users/not-a-uuid')).status).toBe(400);
  });

  it('is only for admins, and /users/me still means the own profile', async () => {
    const customer = await createUser();
    const other = await createUser();

    const forbidden = await api()
      .get(`/api/users/${other.user.id}`)
      .set(authHeader(customer.token));
    const me = await api().get('/api/users/me').set(authHeader(customer.token));

    expect(forbidden.status).toBe(403);
    expect(me.status).toBe(200);
    expect(me.body.data.user.id).toBe(customer.user.id);
  });
});

describe('GET /orders/all?user_id= (admin)', () => {
  it('lists the orders of one customer', async () => {
    const anna = await createUser();
    const max = await createUser();
    const order = await placeOrder(anna);
    await placeOrder(max);

    const res = await asAdmin(`/orders/all?user_id=${anna.user.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.orders.map((o) => o.id)).toEqual([order.id]);
    expect(res.body.data.pagination.total).toBe(1);
  });

  it('checks the user_id', async () => {
    const res = await asAdmin('/orders/all?user_id=42');

    expect(res.status).toBe(400);
  });
});
