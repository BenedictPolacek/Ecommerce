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
    product = await createProduct(admin.token, { price: 10.5, stock_quantity: 5 });
    customer = await createUser();
  });

  it('calculates cart totals', async () => {
    const res = await addToCart(customer.token, product.id, 2);

    expect(res.status).toBe(200);
    expect(res.body.data.cart).toMatchObject({ totalItems: 2, totalAmount: 21 });
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
      .send({ shippingAddress, shippingFee: 4.99 });

    expect(res.status).toBe(201);
    // NUMERIC columns come back from pg as strings to avoid float rounding
    expect(res.body.data.order).toMatchObject({ subtotal: '21.00', total: '25.99' });
    expect(res.body.data.order.items).toHaveLength(1);

    expect(await getStock(product.id)).toBe(3);

    const cart = await api().get('/api/cart').set(authHeader(customer.token));
    expect(cart.body.data.cart.items).toHaveLength(0);
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

    expect(res.status).toBe(403);
  });
});
