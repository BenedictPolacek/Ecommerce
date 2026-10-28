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

const getStock = async (productId) => {
  const { rows } = await query('SELECT stock_quantity FROM products WHERE id = $1', [productId]);
  return rows[0].stock_quantity;
};

const addToCart = (token, productId, quantity) =>
  api().post('/api/cart/items').set(authHeader(token)).send({ productId, quantity });

describe('Cart and checkout', () => {
  let product;
  let customer;

  beforeEach(async () => {
    const admin = await createAdmin();
    product = await createProduct(admin.token, { price_cents: 1050, stock_quantity: 5 });
    customer = await createUser();
  });

  it('calculates cart totals', async () => {
    const res = await addToCart(customer.token, product.id, 2);

    expect(res.status).toBe(200);
    // 2 × 10.50 € = 21.00 € is below the free-shipping threshold (50 €), so 4.99 € shipping
    expect(res.body.data.cart).toMatchObject({
      totalItems: 2,
      subtotalCents: 2100,
      shippingFeeCents: 499,
      totalCents: 2599,
    });
  });

  it('does not allow adding more than the available stock', async () => {
    const res = await addToCart(customer.token, product.id, 6);

    expect(res.status).toBe(400);
  });

  it('creates the order, deducts stock and empties the cart', async () => {
    await addToCart(customer.token, product.id, 2);

    const res = await api()
      .post('/api/orders')
      .set(authHeader(customer.token))
      .send({ shippingAddress });

    expect(res.status).toBe(201);
    // Integer cents come back from pg as plain numbers. VAT is contained: 2599 × 19 / 119 ≈ 415
    expect(res.body.data.order).toMatchObject({
      subtotal_cents: 2100,
      shipping_fee_cents: 499,
      total_cents: 2599,
      tax_cents: 415,
      vat_rate_percent: 19,
    });
    expect(res.body.data.order.items).toHaveLength(1);

    expect(await getStock(product.id)).toBe(3);

    const cart = await api().get('/api/cart').set(authHeader(customer.token));
    expect(cart.body.data.cart.items).toHaveLength(0);
  });

  it('ships for free from 50 € on', async () => {
    // 5 × 10.50 € = 52.50 €
    await addToCart(customer.token, product.id, 5);

    const res = await api()
      .post('/api/orders')
      .set(authHeader(customer.token))
      .send({ shippingAddress });

    expect(res.body.data.order).toMatchObject({
      subtotal_cents: 5250,
      shipping_fee_cents: 0,
      total_cents: 5250,
      tax_cents: 838, // 5250 × 19 / 119 = 838.24
    });
  });

  it('ignores shipping fee and tax sent by the client', async () => {
    await addToCart(customer.token, product.id, 2);

    const res = await api()
      .post('/api/orders')
      .set(authHeader(customer.token))
      .send({ shippingAddress, shippingFee: 0, tax: 0, shipping_fee_cents: 0, tax_cents: 0 });

    expect(res.status).toBe(201);
    expect(res.body.data.order).toMatchObject({ shipping_fee_cents: 499, tax_cents: 415 });
  });

  it('rolls back everything when stock ran out after adding to cart', async () => {
    await addToCart(customer.token, product.id, 4);
    // Someone else bought most of the stock in the meantime
    await query('UPDATE products SET stock_quantity = 1 WHERE id = $1', [product.id]);

    const res = await api()
      .post('/api/orders')
      .set(authHeader(customer.token))
      .send({ shippingAddress });

    expect(res.status).toBe(400);
    expect(await getStock(product.id)).toBe(1);

    const { rowCount } = await query('SELECT 1 FROM orders');
    expect(rowCount).toBe(0);
  });

  it('rejects checkout with an empty cart', async () => {
    const res = await api()
      .post('/api/orders')
      .set(authHeader(customer.token))
      .send({ shippingAddress });

    expect(res.status).toBe(400);
  });

  it("does not let a customer read someone else's order", async () => {
    await addToCart(customer.token, product.id, 1);
    const order = await api()
      .post('/api/orders')
      .set(authHeader(customer.token))
      .send({ shippingAddress });

    const other = await createUser();
    const res = await api()
      .get(`/api/orders/${order.body.data.order.id}`)
      .set(authHeader(other.token));

    // 404, not 403: a 403 would reveal that the order exists
    expect(res.status).toBe(404);
  });
});
