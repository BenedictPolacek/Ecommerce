import pool from '../../config/db.js';

export const cartRepository = {
  /**
   * Find an existing cart or create one for the user
   */
  async findOrCreateCart(userId, client = pool) {
    const existing = await client.query('SELECT * FROM carts WHERE user_id = $1', [userId]);
    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    const created = await client.query(
      'INSERT INTO carts (user_id) VALUES ($1) RETURNING *',
      [userId]
    );
    return created.rows[0];
  },

  /**
   * Find cart by user ID
   */
  async findCartByUserId(userId, client = pool) {
    const { rows } = await client.query('SELECT * FROM carts WHERE user_id = $1', [userId]);
    return rows[0] || null;
  },

  /**
   * Get all items in a cart joined with product details
   */
  async getCartItems(cartId, client = pool) {
    const query = `
      SELECT
        ci.id AS cart_item_id,
        ci.cart_id,
        ci.quantity,
        ci.created_at,
        ci.updated_at,
        p.id AS product_id,
        p.name AS product_name,
        p.sku,
        p.price,
        p.stock_quantity,
        p.is_active,
        ROUND((ci.quantity * p.price)::numeric, 2) AS line_total
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = $1
      ORDER BY ci.created_at ASC
    `;
    const { rows } = await client.query(query, [cartId]);
    return rows;
  },

  /**
   * Find a specific item in a cart
   */
  async findCartItem(cartId, productId, client = pool) {
    const query = 'SELECT * FROM cart_items WHERE cart_id = $1 AND product_id = $2';
    const { rows } = await client.query(query, [cartId, productId]);
    return rows[0] || null;
  },

  /**
   * Add item to cart or increment quantity if already present
   */
  async addItem(cartId, productId, quantity, client = pool) {
    const query = `
      INSERT INTO cart_items (cart_id, product_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (cart_id, product_id)
      DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
      RETURNING *
    `;
    const { rows } = await client.query(query, [cartId, productId, quantity]);
    return rows[0];
  },

  /**
   * Set exact quantity for an item in the cart
   */
  async updateItemQuantity(cartId, productId, quantity, client = pool) {
    const query = `
      UPDATE cart_items
      SET quantity = $3
      WHERE cart_id = $1 AND product_id = $2
      RETURNING *
    `;
    const { rows } = await client.query(query, [cartId, productId, quantity]);
    return rows[0] || null;
  },

  /**
   * Remove a single item from the cart
   */
  async removeItem(cartId, productId, client = pool) {
    const query = 'DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2 RETURNING *';
    const { rows } = await client.query(query, [cartId, productId]);
    return rows[0] || null;
  },

  /**
   * Delete all items in a cart
   */
  async clearCart(cartId, client = pool) {
    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
  },
};

export default cartRepository;
