import { randomUUID } from 'crypto';
import request from 'supertest';
import app from '../../../src/app.js';
import { query } from './db.js';

export const api = () => request(app);

export const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

/**
 * Registers a customer through the API and returns { user, token, password }.
 */
export async function createUser(overrides = {}) {
  const payload = {
    email: `user-${randomUUID()}@example.com`,
    password: 'password123',
    first_name: 'Test',
    last_name: 'User',
    ...overrides,
  };

  const res = await api().post('/api/auth/register').send(payload);
  if (res.status !== 201) {
    throw new Error(`createUser failed (${res.status}): ${res.body.message}`);
  }

  return { ...res.body.data, password: payload.password };
}

/**
 * There is no API to become admin (on purpose), so the role is set directly in the DB.
 * The token stays valid because authorize() reads the role live from the database.
 */
export async function createAdmin() {
  const admin = await createUser({ first_name: 'Admin' });
  await query("UPDATE users SET role = 'admin' WHERE id = $1", [admin.user.id]);
  return admin;
}

export async function createProduct(adminToken, overrides = {}) {
  const res = await api()
    .post('/api/products')
    .set(authHeader(adminToken))
    .send({ name: 'Test Product', price_cents: 1999, stock_quantity: 10, ...overrides });

  if (res.status !== 201) {
    throw new Error(`createProduct failed (${res.status}): ${res.body.message}`);
  }
  return res.body.data;
}

export const shippingAddress = {
  address_line1: 'Teststrasse 1',
  city: 'Berlin',
  postal_code: '10115',
  country: 'DE',
};
