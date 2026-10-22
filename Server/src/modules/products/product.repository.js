import pool from '../../config/db.js';

export const productRepository = {
  /**
   * Find all products with optional filtering and pagination.
   * Joins categories table to include category name.
   *
   * @param {Object} options
   * @param {string}  [options.search]      - Partial match on product name
   * @param {string}  [options.category_id] - Filter by category UUID
   * @param {boolean} [options.is_active]   - Filter by active status (default: true for public)
   * @param {number}  [options.limit]       - Max rows to return
   * @param {number}  [options.offset]      - Rows to skip (for pagination)
   */
  async findAll({ search, category_id, is_active, limit = 20, offset = 0 } = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (search !== undefined) {
      conditions.push(`p.name ILIKE $${idx++}`);
      values.push(`%${search}%`);
    }
    if (category_id !== undefined) {
      conditions.push(`p.category_id = $${idx++}`);
      values.push(category_id);
    }
    if (is_active !== undefined) {
      conditions.push(`p.is_active = $${idx++}`);
      values.push(is_active);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query for pagination metadata
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM products p ${where}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query
    const query = `
      SELECT
        p.id, p.name, p.sku, p.description, p.price,
        p.stock_quantity, p.is_active, p.created_at, p.updated_at,
        p.category_id,
        c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    const result = await pool.query(query, [...values, limit, offset]);

    return { products: result.rows, total };
  },

  /**
   * Find a single product by UUID, joined with its category name.
   */
  async findById(id) {
    const query = `
      SELECT
        p.id, p.name, p.sku, p.description, p.price,
        p.stock_quantity, p.is_active, p.created_at, p.updated_at,
        p.category_id,
        c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  },

  /**
   * Find a product by SKU (for uniqueness checks).
   */
  async findBySku(sku) {
    const query = `SELECT id, sku FROM products WHERE sku = $1`;
    const result = await pool.query(query, [sku]);
    return result.rows[0] || null;
  },

  /**
   * Create a new product.
   */
  async create({ name, sku, description, price, stock_quantity, category_id, is_active }) {
    const query = `
      INSERT INTO products (name, sku, description, price, stock_quantity, category_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, sku, description, price, stock_quantity, category_id, is_active, created_at, updated_at
    `;
    const values = [
      name.trim(),
      sku ? sku.trim() : null,
      description ? description.trim() : null,
      price,
      stock_quantity ?? 0,
      category_id ?? null,
      is_active ?? true,
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  /**
   * Update product fields — only provided (non-undefined) fields are changed.
   * Uses COALESCE to keep existing values for omitted fields.
   */
  async update(id, { name, sku, description, price, stock_quantity, category_id, is_active }) {
    const query = `
      UPDATE products
      SET
        name           = COALESCE($1, name),
        sku            = COALESCE($2, sku),
        description    = COALESCE($3, description),
        price          = COALESCE($4, price),
        stock_quantity = COALESCE($5, stock_quantity),
        category_id    = COALESCE($6, category_id),
        is_active      = COALESCE($7, is_active)
      WHERE id = $8
      RETURNING id, name, sku, description, price, stock_quantity, category_id, is_active, created_at, updated_at
    `;
    const values = [
      name !== undefined ? name.trim() : null,
      sku !== undefined ? (sku ? sku.trim() : null) : null,
      description !== undefined ? (description ? description.trim() : null) : null,
      price !== undefined ? price : null,
      stock_quantity !== undefined ? stock_quantity : null,
      category_id !== undefined ? category_id : null,
      is_active !== undefined ? is_active : null,
      id,
    ];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  },

  /**
   * Set stock_quantity directly (dedicated stock update).
   */
  async updateStock(id, stock_quantity) {
    const query = `
      UPDATE products
      SET stock_quantity = $1
      WHERE id = $2
      RETURNING id, name, sku, stock_quantity, updated_at
    `;
    const result = await pool.query(query, [stock_quantity, id]);
    return result.rows[0] || null;
  },

  /**
   * Soft-delete a product by setting is_active = false.
   */
  async deactivate(id) {
    const query = `
      UPDATE products
      SET is_active = false
      WHERE id = $1
      RETURNING id, name, is_active, updated_at
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  },
};

export default productRepository;
