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
      paymentProvider,
      paymentId,
    }
  ) => {
    const db = client || pool;
    // order_number and currency are filled in by column defaults
    const { rows } = await db.query(
      `INSERT INTO orders (user_id, subtotal_cents, tax_cents, shipping_fee_cents, total_cents,
                           vat_rate_percent, shipping_address, billing_address,
                           payment_provider, payment_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
        paymentProvider || null,
        paymentId || null,
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

  findOrdersByUser: async (userId) => {
    const { rows } = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  },

  findAllOrders: async () => {
    const { rows } = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    return rows;
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
