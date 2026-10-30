import { outbox } from '../../src/mail/mailer.js';
import { resetDatabase, closeDatabase, query } from './helpers/db.js';
import {
  api,
  authHeader,
  createAdmin,
  createProduct,
  createUser,
  shippingAddress,
} from './helpers/factories.js';

beforeEach(async () => {
  await resetDatabase();
  outbox.length = 0;
});
afterAll(closeDatabase);

const deleteMe = (token, password) =>
  api().delete('/api/users/me').set(authHeader(token)).send({ password });
const login = (email, password) => api().post('/api/auth/login').send({ email, password });
const findUser = async (id) =>
  (await query('SELECT * FROM users WHERE id = $1', [id])).rows[0] ?? null;

const placeOrder = async (customer) => {
  const admin = await createAdmin();
  const product = await createProduct(admin.token);
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

describe('DELETE /users/me', () => {
  it('really deletes a user without orders and ends the session', async () => {
    const { user, token, password } = await createUser();
    await query(
      `INSERT INTO addresses (user_id, address_line1, city, postal_code, country)
       VALUES ($1, 'Teststrasse 1', 'Berlin', '10115', 'DE')`,
      [user.id]
    );

    const res = await deleteMe(token, password);

    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'].join('\n')).toMatch(/token=;/);
    expect(await findUser(user.id)).toBeNull();
    const { rowCount } = await query('SELECT 1 FROM addresses WHERE user_id = $1', [user.id]);
    expect(rowCount).toBe(0);
    expect((await api().get('/api/users/me').set(authHeader(token))).status).toBe(401);
    expect(outbox.at(-1)).toMatchObject({
      to: user.email,
      subject: expect.stringMatching(/deleted/i),
    });
  });

  it('anonymizes a user with completed orders and keeps the orders', async () => {
    const customer = await createUser();
    const order = await placeOrder(customer);
    await query("UPDATE orders SET status = 'delivered' WHERE id = $1", [order.id]);

    const res = await deleteMe(customer.token, customer.password);

    expect(res.status).toBe(200);
    const row = await findUser(customer.user.id);
    expect(row).toMatchObject({
      email: `deleted-${customer.user.id}@deleted.invalid`,
      first_name: 'Deleted',
      last_name: 'User',
      email_verified_at: null,
    });
    expect(row.deleted_at).not.toBeNull();
    // Invoice data stays (retention duty)
    const kept = await query('SELECT shipping_address FROM orders WHERE id = $1', [order.id]);
    expect(kept.rows[0].shipping_address).toMatchObject({ city: 'Berlin' });
    for (const table of ['carts', 'sessions', 'user_tokens', 'addresses']) {
      const { rowCount } = await query(`SELECT 1 FROM ${table} WHERE user_id = $1`, [
        customer.user.id,
      ]);
      expect(rowCount).toBe(0);
    }
  });

  it('frees the email: old login fails, a new account with it can be created', async () => {
    const customer = await createUser();
    const order = await placeOrder(customer);
    await query("UPDATE orders SET status = 'cancelled' WHERE id = $1", [order.id]);
    await deleteMe(customer.token, customer.password);

    expect((await login(customer.user.email, customer.password)).status).toBe(401);
    const again = await api().post('/api/auth/register').send({
      email: customer.user.email,
      password: 'password123',
      first_name: 'New',
      last_name: 'Person',
    });
    expect(again.status).toBe(201);
  });

  it('refuses while orders are still open', async () => {
    const customer = await createUser();
    await placeOrder(customer); // pending

    const res = await deleteMe(customer.token, customer.password);

    expect(res.status).toBe(409);
    expect((await findUser(customer.user.id)).deleted_at).toBeNull();
  });

  it('requires the correct password', async () => {
    const { user, token } = await createUser();

    const wrong = await deleteMe(token, 'wrong-password');
    const missing = await api().delete('/api/users/me').set(authHeader(token));

    expect(wrong.status).toBe(400);
    expect(missing.status).toBe(400);
    expect(await findUser(user.id)).not.toBeNull();
  });

  it('never deletes the last admin, but an admin may leave when another one remains', async () => {
    const first = await createAdmin();

    expect((await deleteMe(first.token, first.password)).status).toBe(409);

    await createAdmin();
    expect((await deleteMe(first.token, first.password)).status).toBe(200);
  });
});

describe('DELETE /users/:id (admin)', () => {
  it('lets an admin delete a customer', async () => {
    const admin = await createAdmin();
    const { user, token } = await createUser();

    const res = await api().delete(`/api/users/${user.id}`).set(authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(await findUser(user.id)).toBeNull();
    expect((await api().get('/api/users/me').set(authHeader(token))).status).toBe(401);
  });

  it('refuses to delete admin accounts', async () => {
    const admin = await createAdmin();
    const otherAdmin = await createAdmin();

    const res = await api().delete(`/api/users/${otherAdmin.user.id}`).set(authHeader(admin.token));

    expect(res.status).toBe(403);
    expect((await findUser(otherAdmin.user.id)).deleted_at).toBeNull();
  });

  it('is admin only', async () => {
    const customer = await createUser();
    const other = await createUser();

    const res = await api().delete(`/api/users/${other.user.id}`).set(authHeader(customer.token));

    expect(res.status).toBe(403);
  });

  it('returns 404 for an unknown or already deleted user', async () => {
    const admin = await createAdmin();
    const { user } = await createUser();
    await api().delete(`/api/users/${user.id}`).set(authHeader(admin.token));

    const again = await api().delete(`/api/users/${user.id}`).set(authHeader(admin.token));

    expect(again.status).toBe(404);
  });
});

describe('database guard', () => {
  it('rejects a deleted user that still has a real email address', async () => {
    const { user } = await createUser();

    await expect(
      query(
        'UPDATE users SET deleted_at = CURRENT_TIMESTAMP, email_verified_at = NULL WHERE id = $1',
        [user.id]
      )
    ).rejects.toThrow(/chk_users_deleted_anonymized/);
  });
});
