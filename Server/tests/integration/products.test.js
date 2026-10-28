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

    const one = await api().get(`/api/products/${product.id}`).set(authHeader(token));
    expect(one.body.data.is_active).toBe(false);
  });

  describe('inactive products', () => {
    let admin;
    let hidden;

    beforeEach(async () => {
      admin = await createAdmin();
      await createProduct(admin.token, { name: 'Visible' });
      hidden = await createProduct(admin.token, { name: 'Hidden', is_active: false });
    });

    const names = (res) => res.body.data.products.map((p) => p.name);

    it('ignores ?is_active=false for anonymous visitors', async () => {
      const res = await api().get('/api/products?is_active=false');

      expect(names(res)).toEqual(['Visible']);
    });

    it('ignores ?is_active=false for customers', async () => {
      const customer = await createUser();

      const res = await api().get('/api/products?is_active=false').set(authHeader(customer.token));

      expect(names(res)).toEqual(['Visible']);
    });

    it('lets admins list inactive products', async () => {
      const res = await api().get('/api/products?is_active=false').set(authHeader(admin.token));

      expect(names(res)).toEqual(['Hidden']);
    });

    it('returns 404 for an inactive product to customers, by id and by slug', async () => {
      const byId = await api().get(`/api/products/${hidden.id}`);
      const bySlug = await api().get(`/api/products/${hidden.slug}`);

      expect(byId.status).toBe(404);
      expect(bySlug.status).toBe(404);
    });

    it('shows an inactive product to admins', async () => {
      const res = await api().get(`/api/products/${hidden.id}`).set(authHeader(admin.token));

      expect(res.status).toBe(200);
    });

    it('treats an invalid token as anonymous instead of failing', async () => {
      const res = await api().get('/api/products').set(authHeader('not-a-real-token'));

      expect(res.status).toBe(200);
      expect(names(res)).toEqual(['Visible']);
    });
  });

  it('answers an invalid query parameter with 400 instead of 500', async () => {
    const res = await api().get('/api/products?page=abc');

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([expect.objectContaining({ field: 'page' })]);
  });
});
