import bcrypt from 'bcryptjs';
import pool from '../../config/db.js';
import { config } from '../../config/env.js';
import { categories, products } from './data.js';

/**
 * Inserts sample categories, products and an admin user in one transaction.
 * Idempotent: rows that already exist (same slug, sku or email) are left untouched,
 * so it is safe to run repeatedly.
 * @returns {Promise<{ categories: number, products: number, admin: boolean }>} rows inserted
 */
export async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let insertedCategories = 0;
    for (const category of categories) {
      const { rowCount } = await client.query(
        `INSERT INTO categories (name, slug, description)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [category.name, category.slug, category.description]
      );
      insertedCategories += rowCount;
    }

    let insertedProducts = 0;
    for (const product of products) {
      const { rowCount } = await client.query(
        `INSERT INTO products (category_id, name, sku, description, price, stock_quantity)
         VALUES ((SELECT id FROM categories WHERE slug = $1), $2, $3, $4, $5, $6)
         ON CONFLICT (sku) DO NOTHING`,
        [
          product.category,
          product.name,
          product.sku,
          product.description,
          product.price,
          product.stock_quantity,
        ]
      );
      insertedProducts += rowCount;
    }

    const passwordHash = await bcrypt.hash(config.seed.adminPassword, config.bcrypt.saltRounds);
    const { rowCount: insertedAdmin } = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, 'Admin', 'User', 'admin')
       ON CONFLICT (email) DO NOTHING`,
      [config.seed.adminEmail.toLowerCase(), passwordHash]
    );

    await client.query('COMMIT');

    return {
      categories: insertedCategories,
      products: insertedProducts,
      admin: insertedAdmin === 1,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
