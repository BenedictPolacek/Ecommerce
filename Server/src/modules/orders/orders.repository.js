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

  /**
   * Locks the order row until the transaction ends
   * @param {import('pg').PoolClient} client - Transaction client
   */
  lockOrder: async (client, orderId) => {
    const { rows } = await client.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [orderId]);
    return rows[0] || null;
  },

  findOrderItems: async (orderId, client) => {
    const db = client || pool;
    const { rows } = await db.query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [
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
   * @param {string} [options.search] - Part of the order number or the customer email
   * @param {boolean} [options.withCustomer] - Add `customer` (id, email, name; admin list)
   */
  findOrderSummaries: async ({ userId, status, search, withCustomer = false, limit, offset }) => {
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
    if (search !== undefined) {
      // % and _ are wildcards in LIKE: escape them, the search text is matched literally
      values.push(`%${search.replace(/[\\%_]/g, '\\$&')}%`);
      conditions.push(
        `(o.order_number ILIKE $${values.length} OR u.email ILIKE $${values.length})`
      );
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    // Every order has a user (NOT NULL, ON DELETE RESTRICT); deleted users are anonymized
    const from = 'FROM orders o JOIN users u ON u.id = o.user_id';
    const customer = withCustomer
      ? `, json_build_object(
           'id', u.id, 'email', u.email, 'first_name', u.first_name, 'last_name', u.last_name
         ) AS customer`
      : '';

    const countResult = await pool.query(`SELECT COUNT(*) ${from} ${where}`, values);
    const total = parseInt(countResult.rows[0].count, 10);

    const { rows } = await pool.query(
      `SELECT
         o.id, o.order_number, o.user_id, o.status, o.currency,
         o.subtotal_cents, o.shipping_fee_cents, o.tax_cents, o.total_cents,
         o.created_at, o.updated_at,
         (SELECT COALESCE(SUM(oi.quantity), 0)::int
          FROM order_items oi WHERE oi.order_id = o.id) AS item_count
         ${customer}
       ${from}
       ${where}
       ORDER BY o.created_at DESC, o.id DESC -- id as tiebreaker: stable order across pages
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    return { orders: rows, total };
  },

  /**
   * Only called by changeOrderStatus (order-status.js), which also writes the history
   */
  updateOrderStatus: async (orderId, status, client) => {
    const db = client || pool;
    const { rows } = await db.query('UPDATE orders SET status = $2 WHERE id = $1 RETURNING *', [
      orderId,
      status,
    ]);
    return rows[0] || null;
  },

  /**
   * @param {import('pg').PoolClient} client - Transaction client
   */
  insertStatusHistory: async (client, { orderId, fromStatus, toStatus, changedBy, note }) => {
    const { rows } = await client.query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [orderId, fromStatus ?? null, toStatus, changedBy ?? null, note || null]
    );
    return rows[0];
  },

  /**
   * Status history of an order, oldest first (reads like a timeline)
   */
  /**
   * The customer of an order for admins. Unlike userRepository.findById this also returns
   * deleted (anonymized) users: their orders stay in the books.
   */
  findCustomer: async (userId) => {
    const { rows } = await pool.query(
      'SELECT id, email, first_name, last_name FROM users WHERE id = $1',
      [userId]
    );
    return rows[0] ?? null;
  },

  findStatusHistory: async (orderId) => {
    const { rows } = await pool.query(
      `SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at, id`,
      [orderId]
    );
    return rows;
  },
};

export default orderRepository;
