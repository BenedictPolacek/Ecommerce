import { resetDatabase, closeDatabase, query } from './helpers/db.js';
import { api, authHeader, createUser, shippingAddress } from './helpers/factories.js';

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
  const insertOrder = async ({ subtotal, tax, shipping, total }) => {
    const { user } = await createUser();
    return query(
      `INSERT INTO orders (user_id, subtotal_cents, tax_cents, shipping_fee_cents, total_cents,
                           shipping_address, billing_address)
       VALUES ($1, $2, $3, $4, $5, '{}', '{}')`,
      [user.id, subtotal, tax, shipping, total]
    );
  };

  it('accepts a total of subtotal + shipping, with VAT contained', async () => {
    await expect(
      insertOrder({ subtotal: 1000, tax: 160, shipping: 0, total: 1000 })
    ).resolves.toBeDefined();
  });

  it('rejects a total that does not match its parts', async () => {
    await expect(
      insertOrder({ subtotal: 1000, tax: 0, shipping: 200, total: 9900 })
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('rejects VAT added on top, because prices already include it', async () => {
    await expect(
      insertOrder({ subtotal: 1000, tax: 190, shipping: 0, total: 1190 })
    ).rejects.toMatchObject({ code: '23514' });
  });
});
