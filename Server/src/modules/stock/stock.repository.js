import pool from '../../config/db.js';

export const stockRepository = {
  /**
   * Locks the product row until the transaction ends, so concurrent stock changes queue up
   * @param {import('pg').PoolClient} client - Transaction client
   */
  lockProduct: async (client, productId) => {
    const { rows } = await client.query(
      'SELECT id, stock_quantity FROM products WHERE id = $1 FOR UPDATE',
      [productId]
    );
    return rows[0] || null;
  },

  /**
   * The only way stock changes: updates products.stock_quantity and appends the ledger row.
   * Must run inside a transaction, so both writes succeed or fail together.
   * A negative result violates the CHECK on products.stock_quantity; callers check first.
   *
   * @param {import('pg').PoolClient} client - Transaction client
   * @param {Object} movement
   * @param {number} movement.quantity - Signed change (+ in, - out)
   */
  applyMovement: async (
    client,
    { productId, quantity, reason, orderId = null, createdBy = null, note = null }
  ) => {
    const { rows: products } = await client.query(
      'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2 RETURNING stock_quantity',
      [quantity, productId]
    );
    if (products.length === 0) return null;

    const { rows } = await client.query(
      `INSERT INTO stock_movements
         (product_id, quantity, balance_after, reason, order_id, created_by, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [productId, quantity, products[0].stock_quantity, reason, orderId, createdBy, note || null]
    );
    return rows[0];
  },

  /**
   * One page of a product's movements, newest first, with the order number for order movements
   */
  findByProductId: async ({ productId, limit, offset }) => {
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM stock_movements WHERE product_id = $1',
      [productId]
    );
    const total = parseInt(countResult.rows[0].count, 10);

    const { rows } = await pool.query(
      `SELECT sm.*, o.order_number
       FROM stock_movements sm
       LEFT JOIN orders o ON o.id = sm.order_id
       WHERE sm.product_id = $1
       ORDER BY sm.created_at DESC, sm.id DESC
       LIMIT $2 OFFSET $3`,
      [productId, limit, offset]
    );
    return { movements: rows, total };
  },
};

export default stockRepository;
