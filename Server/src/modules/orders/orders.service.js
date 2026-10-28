import pool from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { orderRepository } from './orders.repository.js';
import { cartRepository } from '../cart/cart.repository.js';
import { calculateOrderTotals } from './pricing.js';
import { isUuid } from '../../utils/uuid.js';

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

        // Deduct stock immediately in transaction
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
          [item.quantity, product.id]
        );

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
        paymentProvider: checkoutData.paymentProvider,
        paymentId: checkoutData.paymentId,
      });

      // 5. Insert order items
      const insertedItems = await orderRepository.insertOrderItems(client, order.id, verifiedItems);

      // 6. Clear user cart items
      await cartRepository.clearCart(cart.id, client);

      // 7. Commit transaction
      await client.query('COMMIT');

      return {
        ...order,
        items: insertedItems,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * List all orders for the authenticated user
   */
  async getMyOrders(userId) {
    const orders = await orderRepository.findOrdersByUser(userId);
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await orderRepository.findOrderItems(order.id);
        return { ...order, items };
      })
    );
    return ordersWithItems;
  },

  /**
   * List all orders in the system (Admin only)
   */
  async getAllOrders() {
    const orders = await orderRepository.findAllOrders();
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await orderRepository.findOrderItems(order.id);
        return { ...order, items };
      })
    );
    return ordersWithItems;
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
    if (!order || (userRole !== 'admin' && order.user_id !== userId)) {
      throw new AppError('Order not found', 404);
    }

    const items = await orderRepository.findOrderItems(order.id);
    return { ...order, items };
  },

  /**
   * Update the status of an existing order (Admin only)
   */
  async updateOrderStatus(orderId, status) {
    const order = await orderRepository.findOrderById(orderId);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    const updated = await orderRepository.updateOrderStatus(orderId, status);
    const items = await orderRepository.findOrderItems(orderId);
    return { ...updated, items };
  },
};

export default orderService;
