import pool from '../../config/db.js';

const COLUMNS = `
  p.id, p.name, p.slug, p.sku, p.description, p.price,
  p.stock_quantity, p.is_active, p.created_at, p.updated_at,
  p.category_id
`;

const RETURNING = `
  id, name, slug, sku, description, price, stock_quantity, category_id, is_active,
  created_at, updated_at
`;

/**
 * Turns user input into a safe prefix tsquery: "Mech keyb!" → "mech:* & keyb:*".
 * Only letters and digits survive, so tsquery operators in the input can never cause syntax errors.
 * Returns null if nothing searchable is left.
 */
export const toPrefixTsQuery = (search) => {
  const words = search.toLowerCase().match(/[\p{L}\p{N}]+/gu);
  return words ? words.map((word) => `${word}:*`).join(' & ') : null;
};

export const productRepository = {
  /**
   * Find all products with optional filtering and pagination.
   * Joins categories table to include category name, plus the primary image.
   *
   * @param {Object} options
   * @param {string}  [options.search]      - Full-text search on name and description (prefix match)
   * @param {string}  [options.category_id] - Filter by category UUID, including its subcategories
   * @param {boolean} [options.is_active]   - Filter by active status (default: true for public)
   * @param {number}  [options.limit]       - Max rows to return
   * @param {number}  [options.offset]      - Rows to skip (for pagination)
   */
  async findAll({ search, category_id, is_active, limit = 20, offset = 0 } = {}) {
    const conditions = [];
    const values = [];
    let idx = 1;
    let orderBy = 'p.created_at DESC';

    const tsQuery = search !== undefined ? toPrefixTsQuery(search) : null;
    if (tsQuery) {
      const searchIdx = idx++;
      conditions.push(`p.search_vector @@ to_tsquery('english', $${searchIdx})`);
      values.push(tsQuery);
      // Best matches first (name hits weigh more than description hits)
      orderBy = `ts_rank(p.search_vector, to_tsquery('english', $${searchIdx})) DESC, ${orderBy}`;
    }
    if (category_id !== undefined) {
      // Include products of all subcategories (Clothing also lists Men → Shirts)
      conditions.push(`p.category_id IN (
        WITH RECURSIVE subtree AS (
          SELECT id FROM categories WHERE id = $${idx++}
          UNION ALL
          SELECT c.id FROM categories c JOIN subtree s ON c.parent_id = s.id
        )
        SELECT id FROM subtree
      )`);
      values.push(category_id);
    }
    if (is_active !== undefined) {
      conditions.push(`p.is_active = $${idx++}`);
      values.push(is_active);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count query for pagination metadata
    const countResult = await pool.query(`SELECT COUNT(*) FROM products p ${where}`, values);
    const total = parseInt(countResult.rows[0].count, 10);

    // Data query. LATERAL runs the image subquery once per product row.
    const query = `
      SELECT
        ${COLUMNS},
        c.name AS category_name,
        img.primary_image
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN LATERAL (
        SELECT json_build_object('url', pi.url, 'alt_text', pi.alt_text) AS primary_image
        FROM product_images pi
        WHERE pi.product_id = p.id
        ORDER BY pi.sort_order
        LIMIT 1
      ) img ON TRUE
      ${where}
      ORDER BY ${orderBy}
      LIMIT $${idx++} OFFSET $${idx++}
    `;
    const result = await pool.query(query, [...values, limit, offset]);

    return { products: result.rows, total };
  },

  /**
   * Find a single product by UUID or slug, joined with its category name and all images.
   * `column` is only ever 'id' or 'slug' from findById/findBySlug, never user input.
   */
  async findOne(column, value) {
    const query = `
      SELECT
        ${COLUMNS},
        c.name AS category_name,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', pi.id, 'url', pi.url, 'alt_text', pi.alt_text, 'sort_order', pi.sort_order
              ) ORDER BY pi.sort_order
            )
            FROM product_images pi
            WHERE pi.product_id = p.id
          ),
          '[]'::json
        ) AS images
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.${column} = $1
    `;
    const result = await pool.query(query, [value]);
    return result.rows[0] || null;
  },

  findById(id) {
    return this.findOne('id', id);
  },

  findBySlug(slug) {
    return this.findOne('slug', slug);
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
   * Slugs that are taken by "base" itself or "base-<n>" (to pick the next free suffix).
   */
  async findSlugsStartingWith(base) {
    const query = `SELECT slug FROM products WHERE slug = $1 OR slug LIKE $2`;
    const result = await pool.query(query, [base, `${base}-%`]);
    return result.rows.map((row) => row.slug);
  },

  /**
   * Create a new product.
   */
  async create({ name, slug, sku, description, price, stock_quantity, category_id, is_active }) {
    const query = `
      INSERT INTO products (name, slug, sku, description, price, stock_quantity, category_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING ${RETURNING}
    `;
    const values = [
      name.trim(),
      slug,
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
  async update(
    id,
    { name, slug, sku, description, price, stock_quantity, category_id, is_active }
  ) {
    const query = `
      UPDATE products
      SET
        name           = COALESCE($1, name),
        sku            = COALESCE($2, sku),
        description    = COALESCE($3, description),
        price          = COALESCE($4, price),
        stock_quantity = COALESCE($5, stock_quantity),
        category_id    = COALESCE($6, category_id),
        is_active      = COALESCE($7, is_active),
        slug           = COALESCE($8, slug)
      WHERE id = $9
      RETURNING ${RETURNING}
    `;
    const values = [
      name !== undefined ? name.trim() : null,
      sku !== undefined ? (sku ? sku.trim() : null) : null,
      description !== undefined ? (description ? description.trim() : null) : null,
      price !== undefined ? price : null,
      stock_quantity !== undefined ? stock_quantity : null,
      category_id !== undefined ? category_id : null,
      is_active !== undefined ? is_active : null,
      slug ?? null,
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
