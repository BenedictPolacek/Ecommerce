import { resetDatabase, closeDatabase } from './helpers/db.js';
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

const billingAddress = {
  address_line1: 'Rechnungsweg 7',
  city: 'Munich',
  postal_code: '80331',
  country: 'DE',
};

describe('Orders', () => {
  let admin;
  let product;
  let customer;

  // Fills the cart and checks out; returns the created order
  const placeOrder = async (user, body = { shippingAddress }) => {
    await api()
      .post('/api/cart/items')
      .set(authHeader(user.token))
      .send({ productId: product.id, quantity: 1 });
    const res = await api().post('/api/orders').set(authHeader(user.token)).send(body);
    if (res.status !== 201) throw new Error(`checkout failed (${res.status}): ${res.body.message}`);
    return res.body.data.order;
  };

  const saveAddress = async (user, address) => {
    const res = await api().post('/api/addresses').set(authHeader(user.token)).send(address);
    return res.body.data.address;
  };

  beforeEach(async () => {
    admin = await createAdmin();
    product = await createProduct(admin.token, { stock_quantity: 10 });
    customer = await createUser();
  });

  describe('order number', () => {
    it('assigns consecutive numbers with the current year', async () => {
      const year = new Date().getFullYear();

      const first = await placeOrder(customer);
      const second = await placeOrder(customer);

      expect(first.order_number).toBe(`ORD-${year}-001001`);
      expect(second.order_number).toBe(`ORD-${year}-001002`);
    });

    it('can be used to fetch the order', async () => {
      const order = await placeOrder(customer);

      const res = await api()
        .get(`/api/orders/${order.order_number}`)
        .set(authHeader(customer.token));

      expect(res.status).toBe(200);
      expect(res.body.data.order.id).toBe(order.id);
    });

    it("returns 404 for someone else's order number, so numbers cannot be probed", async () => {
      const order = await placeOrder(customer);
      const other = await createUser();

      const res = await api().get(`/api/orders/${order.order_number}`).set(authHeader(other.token));

      expect(res.status).toBe(404);
    });

    it('returns 404 for something that is neither a UUID nor an order number', async () => {
      const res = await api().get('/api/orders/not-an-order').set(authHeader(customer.token));

      expect(res.status).toBe(404);
    });
  });

  it("lets an admin read a customer's order", async () => {
    const order = await placeOrder(customer);

    const res = await api().get(`/api/orders/${order.id}`).set(authHeader(admin.token));

    expect(res.status).toBe(200);
  });

  it('stores the currency', async () => {
    const order = await placeOrder(customer);

    expect(order.currency).toBe('EUR');
  });

  describe('billing address', () => {
    it('defaults to the shipping address', async () => {
      const order = await placeOrder(customer);

      expect(order.billing_address).toEqual(order.shipping_address);
    });

    it('can be sent inline', async () => {
      const order = await placeOrder(customer, { shippingAddress, billingAddress });

      expect(order.billing_address).toMatchObject(billingAddress);
      expect(order.shipping_address).toMatchObject(shippingAddress);
    });

    it('can be a saved address', async () => {
      const saved = await saveAddress(customer, billingAddress);

      const order = await placeOrder(customer, { shippingAddress, billingAddressId: saved.id });

      expect(order.billing_address).toMatchObject(billingAddress);
    });

    it("rejects someone else's saved address", async () => {
      const other = await createUser();
      const foreign = await saveAddress(other, billingAddress);
      await api()
        .post('/api/cart/items')
        .set(authHeader(customer.token))
        .send({ productId: product.id, quantity: 1 });

      const res = await api()
        .post('/api/orders')
        .set(authHeader(customer.token))
        .send({ shippingAddress, billingAddressId: foreign.id });

      expect(res.status).toBe(404);
    });

    it('is a snapshot: editing the saved address later does not change the order', async () => {
      const saved = await saveAddress(customer, billingAddress);
      const order = await placeOrder(customer, { shippingAddress, billingAddressId: saved.id });

      await api()
        .put(`/api/addresses/${saved.id}`)
        .set(authHeader(customer.token))
        .send({ city: 'Hamburg' });
      const res = await api().get(`/api/orders/${order.id}`).set(authHeader(customer.token));

      expect(res.body.data.order.billing_address.city).toBe('Munich');
    });
  });
});
