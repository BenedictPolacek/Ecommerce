import { AppError } from '../../utils/AppError.js';
import { orderRepository } from './orders.repository.js';

/**
 * Order lifecycle (state machine): which status may follow which.
 * cancelled and refunded are final. 'paid' is only reached through payments.
 */
export const ORDER_TRANSITIONS = {
  pending: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled', 'refunded'],
  processing: ['shipped', 'cancelled', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

export const canTransition = (from, to) => ORDER_TRANSITIONS[from]?.includes(to) ?? false;

/**
 * The only way an order changes its status after checkout: checks the transition,
 * updates the order and appends the history row in the caller's transaction.
 * The caller must have locked the order row (SELECT ... FOR UPDATE).
 *
 * @param {import('pg').PoolClient} client - Transaction client
 * @param {{ id: string, status: string }} order - Locked order
 * @returns The updated order row
 */
export const changeOrderStatus = async (client, order, toStatus, { userId, note } = {}) => {
  if (!canTransition(order.status, toStatus)) {
    throw new AppError(`Cannot change order status from "${order.status}" to "${toStatus}"`, 409);
  }

  const updated = await orderRepository.updateOrderStatus(order.id, toStatus, client);
  await orderRepository.insertStatusHistory(client, {
    orderId: order.id,
    fromStatus: order.status,
    toStatus,
    changedBy: userId,
    note,
  });
  return updated;
};
