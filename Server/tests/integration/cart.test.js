import { resetDatabase, closeDatabase } from './helpers/db.js';
import { api, authHeader, createAdmin, createProduct, createUser } from './helpers/factories.js';

beforeEach(resetDatabase);
afterAll(closeDatabase);

describe('Cart', () => {
  let admin;
  let customer;
  let product;

  const getCart = () => api().get('/api/cart').set(authHeader(customer.token));

  const addItem = (quantity, productId = product.id) =>
    api().post('/api/cart/items').set(authHeader(customer.token)).send({ productId, quantity });

  const addImage = (body) =>
    api().post(`/api/products/${product.id}/images`).set(authHeader(admin.token)).send(body);

  beforeEach(async () => {
    admin = await createAdmin();
    customer = await createUser({ email: 'customer@example.com' });
    product = await createProduct(admin.token, {
      name: 'Desk Lamp',
      price_cents: 2500,
      stock_quantity: 5,
    });
  });

  it('requires login', async () => {
    const res = await api().get('/api/cart');

    expect(res.status).toBe(401);
  });

  it('starts empty without shipping costs', async () => {
    const res = await getCart();

    expect(res.status).toBe(200);
    expect(res.body.data.cart).toMatchObject({
      items: [],
      totalItems: 0,
      subtotalCents: 0,
      shippingFeeCents: 0,
      totalCents: 0,
    });
  });

  it('returns slug and primary image so the client can link and show the product', async () => {
    await addImage({ url: 'https://cdn.example.com/lamp-front.jpg', alt_text: 'Lamp front' });
    await addImage({ url: 'https://cdn.example.com/lamp-side.jpg' });

    const res = await addItem(2);

    expect(res.status).toBe(200);
    expect(res.body.data.cart.items).toEqual([
      expect.objectContaining({
        product_id: product.id,
        product_name: 'Desk Lamp',
        product_slug: product.slug,
        primary_image: { url: 'https://cdn.example.com/lamp-front.jpg', alt_text: 'Lamp front' },
        quantity: 2,
        line_total_cents: 5000,
      }),
    ]);
  });

  it('returns null as primary image for products without images', async () => {
    await addItem(1);

    const res = await getCart();

    expect(res.body.data.cart.items[0].primary_image).toBeNull();
  });

  it('adds to the quantity already in the cart, up to the stock', async () => {
    await addItem(3);

    const res = await addItem(2);
    expect(res.body.data.cart.items[0].quantity).toBe(5);
    expect(res.body.data.cart.totalItems).toBe(5);

    const tooMany = await addItem(1);
    expect(tooMany.status).toBe(400);
    expect(tooMany.body.message).toMatch(/current stock is 5/i);
  });

  it('updates and removes items', async () => {
    await addItem(1);

    const updated = await api()
      .put(`/api/cart/items/${product.id}`)
      .set(authHeader(customer.token))
      .send({ quantity: 4 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.cart.items[0].quantity).toBe(4);

    const removed = await api()
      .delete(`/api/cart/items/${product.id}`)
      .set(authHeader(customer.token));
    expect(removed.status).toBe(200);
    expect(removed.body.data.cart.items).toEqual([]);
  });

  it('only shows the own cart', async () => {
    await addItem(1);
    const other = await createUser({ email: 'other@example.com' });

    const res = await api().get('/api/cart').set(authHeader(other.token));

    expect(res.body.data.cart.items).toEqual([]);
  });
});
