/** Ports of the end-to-end copy of the app (the dev servers use 3000/5000) */
export const API_PORT = 5100;
export const APP_PORT = 3100;
export const APP_URL = `http://localhost:${APP_PORT}`;

/** Mailpit catches every email the API sends (docker-compose locally, service container in CI) */
export const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025';

/** The seeded admin; passed to the API as SEED_ADMIN_*, so Server/.env does not matter */
export const ADMIN = { email: 'admin@example.com', password: 'admin12345' };

/** A fresh, unique customer per test: the database is shared by all tests of a run */
export const newCustomer = (name = 'Anna') => ({
  first_name: name,
  last_name: 'Tester',
  email: `e2e-${name.toLowerCase()}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`,
  password: 'e2e-password-123',
});

export const shippingAddress = {
  address_line1: 'Teststrasse 12',
  city: 'Berlin',
  postal_code: '10115',
  country: 'DE',
};
