import pool from '../../config/db.js';

export const categoryRepository = {
  /**
   * Find all categories ordered alphabetically
   */
  async findAll() {
    const query = `
      SELECT id, name, slug, description
      FROM categories
      ORDER BY name ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  /**
   * Find category by UUID
   */
  async findById(id) {
    const query = `
      SELECT id, name, slug, description
      FROM categories
      WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  },

  /**
   * Find category by unique slug
   */
  async findBySlug(slug) {
    const query = `
      SELECT id, name, slug, description
      FROM categories
      WHERE slug = $1
    `;
    const result = await pool.query(query, [slug]);
    return result.rows[0] || null;
  },

  /**
   * Create a new category
   */
  async create({ name, slug, description }) {
    const query = `
      INSERT INTO categories (name, slug, description)
      VALUES ($1, $2, $3)
      RETURNING id, name, slug, description
    `;
    const values = [name.trim(), slug.trim(), description ? description.trim() : null];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  /**
   * Update category fields
   */
  async update(id, { name, slug, description }) {
    const query = `
      UPDATE categories
      SET
        name = COALESCE($1, name),
        slug = COALESCE($2, slug),
        description = COALESCE($3, description)
      WHERE id = $4
      RETURNING id, name, slug, description
    `;
    const values = [
      name !== undefined ? name.trim() : null,
      slug !== undefined ? slug.trim() : null,
      // undefined = field not sent (COALESCE keeps existing value)
      // null      = field explicitly cleared
      description !== undefined ? (description?.trim() ?? null) : null,
      id,
    ];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  },

  /**
   * Delete category by ID
   */
  async delete(id) {
    const query = `
      DELETE FROM categories
      WHERE id = $1
      RETURNING id
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  },
};

export default categoryRepository;
