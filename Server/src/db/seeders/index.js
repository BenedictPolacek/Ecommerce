import bcrypt from 'bcryptjs';
import pool from '../../config/db.js';
import { config } from '../../config/env.js';
import { slugify } from '../../utils/slug.js';
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
        `INSERT INTO categories (name, slug, description, parent_id)
         VALUES ($1, $2, $3, (SELECT id FROM categories WHERE slug = $4))
         ON CONFLICT DO NOTHING`,
        [category.name, category.slug, category.description, category.parent ?? null]
      );
      insertedCategories += rowCount;
    }

    let insertedProducts = 0;
    for (const product of products) {
      // Conflicts on sku or slug both mean "already seeded"
      const { rows } = await client.query(
        `INSERT INTO products (category_id, name, slug, sku, description, price_cents, stock_quantity)
         VALUES ((SELECT id FROM categories WHERE slug = $1), $2, $3, $4, $5, $6, $7)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [
          product.category,
          product.name,
          slugify(product.name),
          product.sku,
          product.description,
          product.price_cents,
          product.stock_quantity,
        ]
      );
      if (rows.length === 0) continue;
      insertedProducts += 1;

      // Placeholder image service, stands in for a real CDN
      await client.query(
        `INSERT INTO product_images (product_id, url, alt_text, sort_order) VALUES ($1, $2, $3, 0)`,
        [
          rows[0].id,
          `https://placehold.co/600x600?text=${encodeURIComponent(product.name)}`,
          product.name,
        ]
      );
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
