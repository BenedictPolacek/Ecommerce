import { resetDatabase, closeDatabase, query } from './helpers/db.js';
import { api } from './helpers/factories.js';
import { config } from '../../src/config/env.js';
import { seed } from '../../src/db/seeders/index.js';
import { categories, products } from '../../src/db/seeders/data.js';

beforeEach(resetDatabase);
afterAll(closeDatabase);

describe('Seed', () => {
  it('inserts categories, products and an admin who can log in', async () => {
    const inserted = await seed();

    expect(inserted).toEqual({
      categories: categories.length,
      products: products.length,
      admin: true,
    });

    const { rows } = await query(
      'SELECT COUNT(*)::int AS count FROM products WHERE category_id IS NULL'
    );
    expect(rows[0].count).toBe(0);

    const res = await api()
      .post('/api/auth/login')
      .send({ email: config.seed.adminEmail, password: config.seed.adminPassword });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('admin');
  });

  it('gives every product one Unsplash photo with an alt text', async () => {
    await seed();

    const { rows } = await query(
      `SELECT p.sku, i.url, i.alt_text FROM products p
       LEFT JOIN product_images i ON i.product_id = p.id`
    );
    expect(rows).toHaveLength(products.length);
    for (const row of rows) {
      // Free Unsplash license only (plus.unsplash.com would be the paid Unsplash+)
      expect(row.url).toMatch(/^https:\/\/images\.unsplash\.com\/photo-[\w-]+\?/);
      expect(row.alt_text.length).toBeGreaterThan(10);
    }
  });

  it('keeps hidden products out of the shop', async () => {
    await seed();
    const hidden = products.filter((product) => product.is_active === false);

    const res = await api().get('/api/products').query({ limit: 100 });

    expect(hidden.length).toBeGreaterThan(0);
    const listed = res.body.data.products.map((product) => product.sku);
    expect(listed).toHaveLength(products.length - hidden.length);
    for (const product of hidden) expect(listed).not.toContain(product.sku);
  });

  it('is idempotent: a second run inserts nothing', async () => {
    await seed();
    const second = await seed();

    expect(second).toEqual({ categories: 0, products: 0, admin: false });

    const { rows } = await query('SELECT COUNT(*)::int AS count FROM products');
    expect(rows[0].count).toBe(products.length);
  });
});
