import pool from '../../config/db.js';

const COLUMNS = 'id, parent_id, name, slug, description, created_at, updated_at';

export const categoryRepository = {
  /**
   * Find all categories ordered alphabetically
   */
  async findAll() {
    const query = `
      SELECT ${COLUMNS}
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
      SELECT ${COLUMNS}
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
      SELECT ${COLUMNS}
      FROM categories
      WHERE slug = $1
    `;
    const result = await pool.query(query, [slug]);
    return result.rows[0] || null;
  },

  /**
   * Find a sibling with the same name (case-insensitive) under the same parent
   */
  async findSiblingByName(parentId, name) {
    const query = `
      SELECT ${COLUMNS}
      FROM categories
      WHERE parent_id IS NOT DISTINCT FROM $1 AND LOWER(name) = LOWER($2)
    `;
    const result = await pool.query(query, [parentId, name.trim()]);
    return result.rows[0] || null;
  },

  /**
   * Level of a category in the tree (top-level = 1), counted by walking up its parents
   */
  async getDepth(id) {
    const query = `
      WITH RECURSIVE ancestors AS (
        SELECT id, parent_id FROM categories WHERE id = $1
        UNION ALL
        SELECT c.id, c.parent_id FROM categories c JOIN ancestors a ON c.id = a.parent_id
      )
      SELECT COUNT(*)::int AS depth FROM ancestors
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0].depth;
  },

  /**
   * IDs of a category and all of its descendants
   */
  async findSubtreeIds(id) {
    const query = `
      WITH RECURSIVE subtree AS (
        SELECT id FROM categories WHERE id = $1
        UNION ALL
        SELECT c.id FROM categories c JOIN subtree s ON c.parent_id = s.id
      )
      SELECT id FROM subtree
    `;
    const result = await pool.query(query, [id]);
    return result.rows.map((row) => row.id);
  },

  /**
   * Number of levels a category spans including itself (leaf = 1)
   */
  async getSubtreeHeight(id) {
    const query = `
      WITH RECURSIVE subtree AS (
        SELECT id, 1 AS level FROM categories WHERE id = $1
        UNION ALL
        SELECT c.id, s.level + 1 FROM categories c JOIN subtree s ON c.parent_id = s.id
      )
      SELECT MAX(level)::int AS height FROM subtree
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0].height;
  },

  /**
   * Whether the category still has subcategories or products (active or not)
   */
  async getUsage(id) {
    const query = `
      SELECT
        EXISTS (SELECT 1 FROM categories WHERE parent_id = $1) AS has_children,
        EXISTS (SELECT 1 FROM products WHERE category_id = $1) AS has_products
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  /**
   * Create a new category
   */
  async create({ name, slug, description, parent_id = null }) {
    const query = `
      INSERT INTO categories (name, slug, description, parent_id)
      VALUES ($1, $2, $3, $4)
      RETURNING ${COLUMNS}
    `;
    const values = [name.trim(), slug.trim(), description ? description.trim() : null, parent_id];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  /**
   * Update category fields
   */
  async update(id, { name, slug, description, parent_id }) {
    const query = `
      UPDATE categories
      SET
        name = COALESCE($1, name),
        slug = COALESCE($2, slug),
        description = COALESCE($3, description),
        parent_id = CASE WHEN $4::boolean THEN $5::uuid ELSE parent_id END
      WHERE id = $6
      RETURNING ${COLUMNS}
    `;
    const values = [
      name !== undefined ? name.trim() : null,
      slug !== undefined ? slug.trim() : null,
      // undefined = field not sent (COALESCE keeps existing value)
      // null      = field explicitly cleared
      description !== undefined ? (description?.trim() ?? null) : null,
      // COALESCE cannot tell "not sent" from "move to top level (null)", so a flag decides
      parent_id !== undefined,
      parent_id ?? null,
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
