import pool from '../../../src/config/db.js';

// Every table except pgmigrations, which must survive so the schema stays in place
const TABLES = [
  'stock_movements',
  'payments',
  'order_items',
  'orders',
  'cart_items',
  'product_images',
  'carts',
  'products',
  'categories',
  'addresses',
  'users',
];

/**
 * Guard against wiping a real database by accident (e.g. a wrong .env).
 */
export function assertTestDatabaseName(name) {
  if (!name?.endsWith('_test')) {
    throw new Error(
      `Refusing to run integration tests against "${name}": database name must end with "_test".`
    );
  }
}

/**
 * Deletes all rows so every test starts from an empty, known state.
 */
export async function resetDatabase() {
  const { rows } = await pool.query('SELECT current_database() AS name');
  assertTestDatabaseName(rows[0].name);

  await pool.query(`TRUNCATE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);
}

export const query = (text, params) => pool.query(text, params);

// Open pool connections would keep Jest from exiting
export const closeDatabase = () => pool.end();
