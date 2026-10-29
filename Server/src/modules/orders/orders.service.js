import pool from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { orderRepository } from './orders.repository.js';
import { cartRepository } from '../cart/cart.repository.js';
import { paymentRepository } from '../payments/payment.repository.js';
import { stockRepository } from '../stock/stock.repository.js';
import { calculateOrderTotals } from './pricing.js';
import { changeOrderStatus } from './order-status.js';
import { isUuid } from '../../utils/uuid.js';
import { paginationMeta, toOffset } from '../../utils/pagination.js';

// ORD-2026-001001 (the counter can grow beyond 6 digits)
const ORDER_NUMBER_REGEX = /^ORD-\d{4}-\d{6,}$/;

/**
 * Returns an address snapshot from a saved address (addressId wins) or the inline address.
 * The snapshot is copied into the order, so later edits of the saved address don't change it.
 */
const resolveAddress = async (client, userId, { address, addressId, label }) => {
  if (!addressId) return address ?? null;

  const { rows } = await client.query('SELECT * FROM addresses WHERE id = $1 AND user_id = $2', [
    addressId,
    userId,
  ]);
  if (rows.length === 0) {
    throw new AppError(`Specified ${label} address not found`, 404);
  }
  const { address_line1, address_line2, city, state, postal_code, country } = rows[0];
  return { address_line1, address_line2, city, state, postal_code, country };
};

// Customers see the timeline only; who changed it and internal notes are for admins
const toCustomerHistory = ({ from_status, to_status, created_at }) => ({
  from_status,
  to_status,
  created_at,
});

// Full order as returned by the detail endpoints
const withDetails = async (order, { isAdmin }) => {
  const [items, payments, history] = await Promise.all([
    orderRepository.findOrderItems(order.id),
    paymentRepository.findByOrderId(order.id),
    orderRepository.findStatusHistory(order.id),
  ]);
  const status_history = isAdmin ? history : history.map(toCustomerHistory);
  return { ...order, items, payments, status_history };
};

const listOrders = async ({ userId, status, page, limit }) => {
  const { orders, total } = await orderRepository.findOrderSummaries({
    userId,
    status,
    limit,
    offset: toOffset({ page, limit }),
  });
  return { orders, pagination: paginationMeta({ page, limit }, total) };
};

export const orderService = {
  /**
   * Checkout: Atomic transaction that validates cart items, reserves stock,
   * creates the order, inserts order items, and empties the shopping cart.
   */
  async checkout(userId, checkoutData) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Fetch user's cart
      const cart = await cartRepository.findOrCreateCart(userId, client);
      const cartItems = await cartRepository.getCartItems(cart.id, client);

      if (!cartItems || cartItems.length === 0) {
        throw new AppError('Your cart is empty. Add products to cart before checking out.', 400);
      }

      // 2. Determine shipping and billing address (billing defaults to shipping)
      const shippingAddress = await resolveAddress(client, userId, {
        address: checkoutData.shippingAddress,
        addressId: checkoutData.addressId,
        label: 'shipping',
      });
      if (!shippingAddress) {
        throw new AppError('A valid shipping address is required for checkout', 400);
      }

      const billingAddress =
        (await resolveAddress(client, userId, {
          address: checkoutData.billingAddress,
          addressId: checkoutData.billingAddressId,
          label: 'billing',
        })) ?? shippingAddress;

      // 3. Verify stock, active state, and calculate subtotal with row locks (FOR UPDATE)
      let subtotalCents = 0;
      const verifiedItems = [];

      for (const item of cartItems) {
        const prodRes = await client.query(
          'SELECT id, name, price_cents, stock_quantity, is_active FROM products WHERE id = $1 FOR UPDATE',
          [item.product_id]
        );

        if (prodRes.rows.length === 0 || !prodRes.rows[0].is_active) {
          throw new AppError(`Product "${item.product_name}" is no longer available`, 400);
        }

        const product = prodRes.rows[0];
        if (product.stock_quantity < item.quantity) {
          throw new AppError(
            `Insufficient stock for "${product.name}". Available: ${product.stock_quantity}, requested: ${item.quantity}`,
            400
          );
        }

        // Integer cents: exact, no rounding needed
        subtotalCents += product.price_cents * item.quantity;

        verifiedItems.push({
          product_id: product.id,
          name: product.name,
          unit_price_cents: product.price_cents,
          quantity: item.quantity,
        });
      }

      // Shipping and tax are always calculated on the server, never taken from the client
      const totals = calculateOrderTotals(subtotalCents);

      // 4. Create Order record
      const order = await orderRepository.createOrder(client, {
        userId,
        ...totals,
        shippingAddress,
        billingAddress,
      });

      // 5. First history entry: the order starts as pending
      const historyEntry = await orderRepository.insertStatusHistory(client, {
        orderId: order.id,
        toStatus: order.status,
        changedBy: userId,
      });

      // 6. Insert order items
      const insertedItems = await orderRepository.insertOrderItems(client, order.id, verifiedItems);

      // 7. Deduct stock as 'sale' movements. Only now, because a sale references its order;
      //    the product rows are still locked (FOR UPDATE above) until COMMIT.
      for (const item of verifiedItems) {
        await stockRepository.applyMovement(client, {
          productId: item.product_id,
          quantity: -item.quantity,
          reason: 'sale',
          orderId: order.id,
          createdBy: userId,
        });
      }

      // 8. Clear user cart items
      await cartRepository.clearCart(cart.id, client);

      // 9. Commit transaction
      await client.query('COMMIT');

      return {
        ...order,
        items: insertedItems,
        payments: [],
        status_history: [toCustomerHistory(historyEntry)],
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * One page of the authenticated user's orders (summaries, newest first)
   */
  async getMyOrders(userId, query) {
    return listOrders({ ...query, userId });
  },

  /**
   * One page of all orders in the system (Admin only)
   */
  async getAllOrders(query) {
    return listOrders(query);
  },

  /**
   * Get single order by UUID or order number (ORD-2026-001001) with ownership verification
   */
  async getOrderByIdOrNumber(idOrNumber, userId, userRole) {
    let order = null;
    if (isUuid(idOrNumber)) {
      order = await orderRepository.findOrderById(idOrNumber);
    } else if (ORDER_NUMBER_REGEX.test(idOrNumber)) {
      order = await orderRepository.findOrderByNumber(idOrNumber);
    }
    // Someone else's order gets the same 404 as a missing one: order numbers are
    // sequential, so a 403 would confirm which numbers exist (enumeration)
    const isAdmin = userRole === 'admin';
    if (!order || (!isAdmin && order.user_id !== userId)) {
      throw new AppError('Order not found', 404);
    }

    return withDetails(order, { isAdmin });
  },

  /**
   * Update the status of an existing order (Admin only).
   * Allowed transitions: see order-status.js. The same status again is a no-op (idempotent).
   */
  async updateOrderStatus(orderId, { status, note }, userId) {
    const client = await pool.connect();
    let updated;

    try {
      await client.query('BEGIN');

      // FOR UPDATE: two parallel cancellations must not both put the stock back
      const order = await orderRepository.lockOrder(client, orderId);
      if (!order) {
        throw new AppError('Order not found', 404);
      }

      if (order.status === status) {
        updated = order;
      } else {
        updated = await changeOrderStatus(client, order, status, { userId, note });
      }

      // Only on the actual change to cancelled (not on a repeated request)
      if (status === 'cancelled' && order.status !== 'cancelled') {
        const items = await orderRepository.findOrderItems(orderId, client);
        // Sorted by product: concurrent transactions lock rows in the same order (no deadlock)
        items.sort((a, b) => a.product_id.localeCompare(b.product_id));
        for (const item of items) {
          await stockRepository.applyMovement(client, {
            productId: item.product_id,
            quantity: item.quantity,
            reason: 'order_cancelled',
            orderId,
            createdBy: userId,
          });
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return withDetails(updated, { isAdmin: true });
  },
};

export default orderService;
