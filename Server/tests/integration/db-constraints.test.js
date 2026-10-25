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

// These tests bypass the API on purpose: the database itself must reject bad data,
// even if a bug or a script skips the validation layer.

describe('Default address', () => {
  const createAddress = (token, overrides = {}) =>
    api()
      .post('/api/addresses')
      .set(authHeader(token))
      .send({ ...shippingAddress, ...overrides });

  it('keeps exactly one default when a new default is created', async () => {
    const { token, user } = await createUser();
    await createAddress(token, { is_default: true });
    const second = await createAddress(token, { is_default: true, city: 'Hamburg' });

    expect(second.status).toBe(201);

    const { rows } = await query('SELECT city FROM addresses WHERE user_id = $1 AND is_default', [
      user.id,
    ]);
    expect(rows).toEqual([{ city: 'Hamburg' }]);
  });

  it('rejects a second default address at the database level', async () => {
    const { token, user } = await createUser();
    await createAddress(token, { is_default: true });

    await expect(
      query(
        `INSERT INTO addresses (user_id, address_line1, city, postal_code, country, is_default)
         VALUES ($1, 'Other 2', 'Munich', '80331', 'DE', TRUE)`,
        [user.id]
      )
    ).rejects.toMatchObject({ code: '23505' });
  });
});

describe('User email', () => {
  it('stores emails lowercase', async () => {
    const { user } = await createUser({ email: 'Mixed.Case@Example.com' });

    const { rows } = await query('SELECT email FROM users WHERE id = $1', [user.id]);
    expect(rows[0].email).toBe('mixed.case@example.com');
  });

  it('rejects an uppercase email at the database level', async () => {
    await expect(
      query(
        `INSERT INTO users (email, password_hash, first_name, last_name)
         VALUES ('Upper@Example.com', 'x', 'A', 'B')`
      )
    ).rejects.toMatchObject({ code: '23514' });
  });
});

describe('Order total', () => {
  it('rejects a total that does not match its parts', async () => {
    const { user } = await createUser();

    await expect(
      query(
        `INSERT INTO orders (user_id, subtotal, tax, shipping_fee, total, shipping_address)
         VALUES ($1, 10.00, 1.00, 2.00, 99.00, '{}')`,
        [user.id]
      )
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('rounds fees to cents so checkout satisfies the total check', async () => {
    const admin = await createAdmin();
    const product = await createProduct(admin.token, { price: 10.5 });
    const customer = await createUser();
    await api()
      .post('/api/cart/items')
      .set(authHeader(customer.token))
      .send({ productId: product.id, quantity: 1 });

    const res = await api()
      .post('/api/orders')
      .set(authHeader(customer.token))
      .send({ shippingAddress, shippingFee: 4.999, tax: 0.333 });

    expect(res.status).toBe(201);
    expect(res.body.data.order).toMatchObject({
      subtotal: '10.50',
      shipping_fee: '5.00',
      tax: '0.33',
      total: '15.83',
    });
  });
});
