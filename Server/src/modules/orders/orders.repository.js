import pool from '../../config/db.js';

export const orderRepository = {
  /**
   * Create an order record
   * @param {import('pg').PoolClient} [client] - Optional transaction client
   * @param {Object} orderData
   */
  createOrder: async (
    client,
    { userId, subtotal, tax, shippingFee, total, shippingAddress, paymentProvider, paymentId }
  ) => {
    const db = client || pool;
    const { rows } = await db.query(
      `INSERT INTO orders (user_id, subtotal, tax, shipping_fee, total, shipping_address, payment_provider, payment_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        userId,
        subtotal,
        tax || 0.0,
        shippingFee || 0.0,
        total,
        typeof shippingAddress === 'object' ? JSON.stringify(shippingAddress) : shippingAddress,
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
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          orderId,
          item.product_id || item.productId,
          item.product_name || item.name,
          item.unit_price ?? item.price,
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

  findOrderItems: async (orderId) => {
    const { rows } = await pool.query(
      'SELECT * FROM order_items WHERE order_id = $1 ORDER BY id',
      [orderId]
    );
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
    const { rows } = await pool.query(
      'UPDATE orders SET status = $2 WHERE id = $1 RETURNING *',
      [orderId, status]
    );
    return rows[0] || null;
  },
};

export default orderRepository;