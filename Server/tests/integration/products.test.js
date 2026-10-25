import { resetDatabase, closeDatabase } from './helpers/db.js';
import { api, authHeader, createAdmin, createProduct, createUser } from './helpers/factories.js';

beforeEach(resetDatabase);
afterAll(closeDatabase);

describe('Products', () => {
  it('lets an admin create a product that shows up in the public list', async () => {
    const { token } = await createAdmin();
    const product = await createProduct(token, { name: 'Keyboard', sku: 'KB-1' });

    const res = await api().get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(1);
    expect(res.body.data.products[0]).toMatchObject({ id: product.id, name: 'Keyboard' });
  });

  it('forbids customers from creating products', async () => {
    const { token } = await createUser();

    const res = await api()
      .post('/api/products')
      .set(authHeader(token))
      .send({ name: 'Hack', price: 1 });

    expect(res.status).toBe(403);
  });

  it('rejects a duplicate SKU with 409', async () => {
    const { token } = await createAdmin();
    await createProduct(token, { sku: 'DUP-1' });

    const res = await api()
      .post('/api/products')
      .set(authHeader(token))
      .send({ name: 'Other', price: 5, sku: 'DUP-1' });

    expect(res.status).toBe(409);
  });

  it('soft-deletes: the product disappears from the list but stays in the database', async () => {
    const { token } = await createAdmin();
    const product = await createProduct(token);

    const del = await api().delete(`/api/products/${product.id}`).set(authHeader(token));
    expect(del.status).toBe(200);

    const list = await api().get('/api/products');
    expect(list.body.data.products).toHaveLength(0);

    const one = await api().get(`/api/products/${product.id}`);
    expect(one.body.data.is_active).toBe(false);
  });
});
