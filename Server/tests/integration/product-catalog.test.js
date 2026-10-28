import { resetDatabase, closeDatabase } from './helpers/db.js';
import { api, authHeader, createAdmin, createProduct } from './helpers/factories.js';

beforeEach(resetDatabase);
afterAll(closeDatabase);

let admin;
beforeEach(async () => {
  admin = await createAdmin();
});

describe('Product slug', () => {
  it('generates a slug and numbers duplicates', async () => {
    const first = await createProduct(admin.token, { name: 'T-Shirt' });
    const second = await createProduct(admin.token, { name: 'T-Shirt' });

    expect(first.slug).toBe('t-shirt');
    expect(second.slug).toBe('t-shirt-2');
  });

  it('rejects an explicit slug that is already taken', async () => {
    await createProduct(admin.token, { name: 'Hoodie' });

    const res = await api()
      .post('/api/products')
      .set(authHeader(admin.token))
      .send({ name: 'Other', slug: 'hoodie', price: 10 });

    expect(res.status).toBe(409);
  });

  it('keeps the slug when the product is renamed', async () => {
    const product = await createProduct(admin.token, { name: 'Old Name' });

    const res = await api()
      .put(`/api/products/${product.id}`)
      .set(authHeader(admin.token))
      .send({ name: 'New Name' });

    expect(res.body.data).toMatchObject({ name: 'New Name', slug: 'old-name' });
  });

  it('can be fetched by slug or by id', async () => {
    const product = await createProduct(admin.token, { name: 'Desk Lamp' });

    const bySlug = await api().get('/api/products/desk-lamp');
    const byId = await api().get(`/api/products/${product.id}`);

    expect(bySlug.status).toBe(200);
    expect(bySlug.body.data.id).toBe(product.id);
    expect(byId.body.data.slug).toBe('desk-lamp');
  });

  it('returns 404 for an unknown slug', async () => {
    const res = await api().get('/api/products/does-not-exist');

    expect(res.status).toBe(404);
  });
});

describe('Product images', () => {
  let product;

  const addImage = (body) =>
    api().post(`/api/products/${product.id}/images`).set(authHeader(admin.token)).send(body);

  beforeEach(async () => {
    product = await createProduct(admin.token, { name: 'Camera' });
  });

  it('appends images and returns them in order on the product', async () => {
    await addImage({ url: 'https://cdn.example.com/front.jpg', alt_text: 'Front' });
    await addImage({ url: 'https://cdn.example.com/back.jpg' });

    const res = await api().get(`/api/products/${product.id}`);

    expect(res.body.data.images).toEqual([
      expect.objectContaining({ url: 'https://cdn.example.com/front.jpg', sort_order: 0 }),
      expect.objectContaining({ url: 'https://cdn.example.com/back.jpg', sort_order: 1 }),
    ]);
  });

  it('shows the first image as primary_image in the list', async () => {
    await addImage({ url: 'https://cdn.example.com/front.jpg', alt_text: 'Front' });
    await addImage({ url: 'https://cdn.example.com/back.jpg' });

    const res = await api().get('/api/products');

    expect(res.body.data.products[0].primary_image).toEqual({
      url: 'https://cdn.example.com/front.jpg',
      alt_text: 'Front',
    });
  });

  it('swaps positions on reorder (deferred unique constraint)', async () => {
    const front = (await addImage({ url: 'https://cdn.example.com/front.jpg' })).body.data.image;
    const back = (await addImage({ url: 'https://cdn.example.com/back.jpg' })).body.data.image;

    const res = await api()
      .put(`/api/products/${product.id}/images/order`)
      .set(authHeader(admin.token))
      .send({ image_ids: [back.id, front.id] });

    expect(res.status).toBe(200);
    expect(res.body.data.images.map((image) => image.id)).toEqual([back.id, front.id]);
  });

  it('rejects a reorder that does not list every image exactly once', async () => {
    const front = (await addImage({ url: 'https://cdn.example.com/front.jpg' })).body.data.image;
    await addImage({ url: 'https://cdn.example.com/back.jpg' });

    const res = await api()
      .put(`/api/products/${product.id}/images/order`)
      .set(authHeader(admin.token))
      .send({ image_ids: [front.id, front.id] });

    expect(res.status).toBe(400);
  });

  it('rejects non-http(s) URLs', async () => {
    const res = await addImage({ url: 'javascript:alert(1)' });

    expect(res.status).toBe(400);
  });

  it('deletes an image, and the next one becomes primary', async () => {
    const front = (await addImage({ url: 'https://cdn.example.com/front.jpg' })).body.data.image;
    await addImage({ url: 'https://cdn.example.com/back.jpg' });

    const del = await api()
      .delete(`/api/products/${product.id}/images/${front.id}`)
      .set(authHeader(admin.token));
    const list = await api().get('/api/products');

    expect(del.status).toBe(200);
    expect(list.body.data.products[0].primary_image.url).toBe('https://cdn.example.com/back.jpg');
  });
});

describe('Product search', () => {
  const search = (term) => api().get(`/api/products?search=${encodeURIComponent(term)}`);
  const names = (res) => res.body.data.products.map((p) => p.name);

  beforeEach(async () => {
    await createProduct(admin.token, {
      name: 'Mechanical Keyboard',
      description: 'Tenkeyless with hot-swappable switches',
    });
    await createProduct(admin.token, {
      name: 'Wrist Rest',
      description: 'Soft wrist rest for any keyboard',
    });
    await createProduct(admin.token, { name: 'Coffee Mug', description: 'Ceramic, 300 ml' });
  });

  it('finds word prefixes ("keyb" → Keyboard)', async () => {
    expect(names(await search('keyb'))).toContain('Mechanical Keyboard');
  });

  it('matches stemmed forms ("keyboards" → keyboard)', async () => {
    expect(names(await search('keyboards'))).toContain('Mechanical Keyboard');
  });

  it('ranks name matches above description matches', async () => {
    expect(names(await search('keyboard'))).toEqual(['Mechanical Keyboard', 'Wrist Rest']);
  });

  it('requires all words to match', async () => {
    expect(names(await search('keyboard mug'))).toEqual([]);
  });

  it('ignores operator characters instead of failing', async () => {
    const res = await search('mug & | !');

    expect(res.status).toBe(200);
    expect(names(res)).toEqual(['Coffee Mug']);
  });
});
