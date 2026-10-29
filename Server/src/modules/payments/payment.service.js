import pool from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { paymentRepository } from './payment.repository.js';
import { orderRepository } from '../orders/orders.repository.js';
import { changeOrderStatus } from '../orders/order-status.js';

export const paymentService = {
  /**
   * Records a payment that has already arrived (e.g. bank transfer), entered by an admin.
   * Once the succeeded payments cover the order total, the order becomes 'paid'.
   */
  async recordManualPayment(orderId, { provider, providerPaymentId, amountCents }, userId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // FOR UPDATE: two admins recording at the same time must not both see the old balance
      const order = await orderRepository.lockOrder(client, orderId);
      if (!order) {
        throw new AppError('Order not found', 404);
      }
      if (order.status !== 'pending') {
        throw new AppError(
          `Cannot record a payment for an order with status "${order.status}"`,
          409
        );
      }

      const paidCents = await paymentRepository.sumSucceeded(orderId, client);
      const outstandingCents = order.total_cents - paidCents;
      const amount = amountCents ?? outstandingCents;
      if (amount > outstandingCents) {
        throw new AppError(
          `Amount exceeds the outstanding balance of ${outstandingCents} cents`,
          409
        );
      }

      const payment = await paymentRepository.create(client, {
        orderId,
        provider,
        providerPaymentId,
        status: 'succeeded',
        amountCents: amount,
        // Always the order's currency, never taken from the request
        currency: order.currency,
      });

      const fullyPaid = paidCents + amount === order.total_cents;
      if (fullyPaid) {
        await changeOrderStatus(client, order, 'paid', { userId });
      }

      await client.query('COMMIT');

      return {
        payment,
        orderStatus: fullyPaid ? 'paid' : order.status,
        outstandingCents: outstandingCents - amount,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
};

export default paymentService;
