import pool from '../../config/db.js';

export const orderRepository = {
  /**
   * Create an order record
   * @param {import('pg').PoolClient} [client] - Optional transaction client
   * @param {Object} orderData
   */
  createOrder: async (
    client,
    {
      userId,
      subtotalCents,
      taxCents,
      shippingFeeCents,
      totalCents,
      vatRatePercent,
      shippingAddress,
      billingAddress,
    }
  ) => {
    const db = client || pool;
    // order_number and currency are filled in by column defaults
    const { rows } = await db.query(
      `INSERT INTO orders (user_id, subtotal_cents, tax_cents, shipping_fee_cents, total_cents,
                           vat_rate_percent, shipping_address, billing_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        subtotalCents,
        taxCents,
        shippingFeeCents,
        totalCents,
        vatRatePercent,
        JSON.stringify(shippingAddress),
        JSON.stringify(billingAddress),
      ]
    );
    return rows[0];
  },

  /**
   * Bulk insert items belonging to an order
   * @param {import('pg').PoolClient} [client] - Optional transaction client
   * @param {string} orderId
   * @param {Array} items
   */
  insertOrderItems: async (client, orderId, items) => {
    const db = client || pool;
    const insertedItems = [];
    for (const item of items) {
      const { rows } = await db.query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price_cents, quantity)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          orderId,
          item.product_id || item.productId,
          item.product_name || item.name,
          item.unit_price_cents,
          item.quantity,
        ]
      );
      insertedItems.push(rows[0]);
    }
    return insertedItems;
  },

  findOrderById: async (orderId) => {
    const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    return rows[0] || null;
  },

  findOrderByNumber: async (orderNumber) => {
    const { rows } = await pool.query('SELECT * FROM orders WHERE order_number = $1', [
      orderNumber,
    ]);
    return rows[0] || null;
  },

  findOrderItems: async (orderId) => {
    const { rows } = await pool.query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [
      orderId,
    ]);
    return rows;
  },

  /**
   * One page of order summaries, newest first. A single query (no N+1): item_count is a
   * subquery per row inside the same statement. Items themselves are only in GET /orders/:id.
   *
   * @param {Object} options
   * @param {string} [options.userId] - Only orders of this user (omit for all, admin)
   * @param {string} [options.status] - Only orders with this status
   */
  findOrderSummaries: async ({ userId, status, limit, offset }) => {
    const conditions = [];
    const values = [];
    if (userId !== undefined) {
      values.push(userId);
      conditions.push(`o.user_id = $${values.length}`);
    }
    if (status !== undefined) {
      values.push(status);
      conditions.push(`o.status = $${values.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(`SELECT COUNT(*) FROM orders o ${where}`, values);
    const total = parseInt(countResult.rows[0].count, 10);

    const { rows } = await pool.query(
      `SELECT
         o.id, o.order_number, o.user_id, o.status, o.currency,
         o.subtotal_cents, o.shipping_fee_cents, o.tax_cents, o.total_cents,
         o.created_at, o.updated_at,
         (SELECT COALESCE(SUM(oi.quantity), 0)::int
          FROM order_items oi WHERE oi.order_id = o.id) AS item_count
       FROM orders o
       ${where}
       ORDER BY o.created_at DESC, o.id DESC -- id as tiebreaker: stable order across pages
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    return { orders: rows, total };
  },

  updateOrderStatus: async (orderId, status) => {
    const { rows } = await pool.query('UPDATE orders SET status = $2 WHERE id = $1 RETURNING *', [
      orderId,
      status,
    ]);
    return rows[0] || null;
  },
};

export default orderRepository;
