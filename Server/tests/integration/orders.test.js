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

    it('shows admins the customer of the order, customers do not get it', async () => {
      const order = await placeOrder(customer);

      const asAdmin = await api()
        .get(`/api/orders/${order.order_number}`)
        .set(authHeader(admin.token));
      const asCustomer = await api()
        .get(`/api/orders/${order.order_number}`)
        .set(authHeader(customer.token));

      expect(asAdmin.body.data.order.customer).toEqual({
        id: customer.user.id,
        email: customer.user.email,
        first_name: 'Test',
        last_name: 'User',
      });
      expect(asCustomer.body.data.order).not.toHaveProperty('customer');
    });

    it('still shows admins the (anonymized) customer after the account was deleted', async () => {
      const order = await placeOrder(customer);
      // Open orders block the deletion: cancel it first
      await api()
        .patch(`/api/orders/${order.id}/status`)
        .set(authHeader(admin.token))
        .send({ status: 'cancelled' });
      await api()
        .delete('/api/users/me')
        .set(authHeader(customer.token))
        .send({ password: customer.password });

      const res = await api().get(`/api/orders/${order.id}`).set(authHeader(admin.token));

      expect(res.status).toBe(200);
      expect(res.body.data.order.customer).toEqual(
        expect.objectContaining({ id: customer.user.id, first_name: 'Deleted' })
      );
      expect(res.body.data.order.customer.email).toMatch(/@deleted\.invalid$/);
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

  describe('order lists', () => {
    const listMine = (user, query = '') =>
      api().get(`/api/orders${query}`).set(authHeader(user.token));
    const listAll = (query = '') =>
      api().get(`/api/orders/all${query}`).set(authHeader(admin.token));
    // 'paid' can only be reached by recording a payment
    const pay = (order) =>
      api().post(`/api/orders/${order.id}/payments`).set(authHeader(admin.token)).send({});

    it('returns summaries with item_count instead of items', async () => {
      const order = await placeOrder(customer);

      const res = await listMine(customer);

      expect(res.status).toBe(200);
      expect(res.body.data.orders).toEqual([
        expect.objectContaining({ order_number: order.order_number, item_count: 1 }),
      ]);
      expect(res.body.data.orders[0]).not.toHaveProperty('items');
    });

    it('only lists the customer’s own orders', async () => {
      await placeOrder(customer);
      const other = await createUser();
      await placeOrder(other);

      const res = await listMine(customer);

      expect(res.body.data.pagination.total).toBe(1);
    });

    it('paginates, newest first', async () => {
      const first = await placeOrder(customer);
      const second = await placeOrder(customer);
      const third = await placeOrder(customer);

      const page1 = await listMine(customer, '?limit=2');
      const page2 = await listMine(customer, '?limit=2&page=2');

      expect(page1.body.data.orders.map((o) => o.id)).toEqual([third.id, second.id]);
      expect(page2.body.data.orders.map((o) => o.id)).toEqual([first.id]);
      expect(page1.body.data.pagination).toEqual({ page: 1, limit: 2, total: 3, totalPages: 2 });
    });

    it('lets admins list all orders and filter by status', async () => {
      const paid = await placeOrder(customer);
      const other = await createUser();
      await placeOrder(other);
      await pay(paid);

      const all = await listAll();
      const onlyPaid = await listAll('?status=paid');

      expect(all.body.data.pagination.total).toBe(2);
      expect(onlyPaid.body.data.orders.map((o) => o.id)).toEqual([paid.id]);
    });

    it('shows the customer of each order in the admin list only', async () => {
      await placeOrder(customer);

      const all = await listAll();
      const mine = await listMine(customer);

      expect(all.body.data.orders[0].customer).toEqual({
        id: customer.user.id,
        email: customer.user.email,
        first_name: 'Test',
        last_name: 'User',
      });
      expect(mine.body.data.orders[0]).not.toHaveProperty('customer');
    });

    it('lets admins search by part of the order number or the email (any case)', async () => {
      const mine = await placeOrder(customer);
      const anna = await createUser({ email: `anna-${Date.now()}@shop-test.com` });
      const annas = await placeOrder(anna);

      const byNumber = await listAll(`?search=${mine.order_number.slice(-6).toLowerCase()}`);
      const byEmail = await listAll('?search=ANNA-');
      const empty = await listAll('?search=');

      expect(byNumber.body.data.orders.map((o) => o.id)).toEqual([mine.id]);
      expect(byEmail.body.data.orders.map((o) => o.id)).toEqual([annas.id]);
      expect(byEmail.body.data.pagination.total).toBe(1);
      expect(empty.body.data.pagination.total).toBe(2);
    });

    it('matches LIKE wildcards in the search literally', async () => {
      await placeOrder(customer);

      const percent = await listAll(`?search=${encodeURIComponent('%')}`);
      const underscore = await listAll('?search=_');

      expect(percent.body.data.orders).toEqual([]);
      expect(underscore.body.data.orders).toEqual([]);
    });

    it('ignores the search in the customer list', async () => {
      await placeOrder(customer);

      const res = await listMine(customer, '?search=does-not-match');

      expect(res.body.data.pagination.total).toBe(1);
    });

    it('rejects an unknown status with 400', async () => {
      const res = await listAll('?status=lost');

      expect(res.status).toBe(400);
    });

    it('does not let customers use the admin list', async () => {
      const res = await api().get('/api/orders/all').set(authHeader(customer.token));

      expect(res.status).toBe(403);
    });
  });
});
