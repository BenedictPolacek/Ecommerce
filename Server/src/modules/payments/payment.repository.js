import pool from '../../config/db.js';

export const paymentRepository = {
  findByOrderId: async (orderId, client) => {
    const db = client || pool;
    const { rows } = await db.query(
      'SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at, id',
      [orderId]
    );
    return rows;
  },

  /**
   * Sum of all succeeded payments of an order, in cents
   * @param {import('pg').PoolClient} [client] - Optional transaction client
   */
  sumSucceeded: async (orderId, client) => {
    const db = client || pool;
    const { rows } = await db.query(
      `SELECT COALESCE(SUM(amount_cents), 0)::int AS paid_cents
       FROM payments WHERE order_id = $1 AND status = 'succeeded'`,
      [orderId]
    );
    return rows[0].paid_cents;
  },

  /**
   * @param {import('pg').PoolClient} [client] - Optional transaction client
   */
  create: async (
    client,
    { orderId, provider, providerPaymentId, status, amountCents, currency }
  ) => {
    const db = client || pool;
    const { rows } = await db.query(
      `INSERT INTO payments (order_id, provider, provider_payment_id, status, amount_cents, currency)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [orderId, provider, providerPaymentId || null, status, amountCents, currency]
    );
    return rows[0];
  },
};

export default paymentRepository;
