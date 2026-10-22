import pool from '../../config/db.js';
import { AppError } from '../../utils/AppError.js';
import { orderRepository } from './orders.repository.js';
import { cartRepository } from '../cart/cart.repository.js';

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

      // 2. Determine shipping address
      let resolvedAddress = checkoutData.shippingAddress;
      if (checkoutData.addressId) {
        const addrRes = await client.query(
          'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
          [checkoutData.addressId, userId]
        );
        if (addrRes.rows.length === 0) {
          throw new AppError('Specified shipping address not found', 404);
        }
        const addr = addrRes.rows[0];
        resolvedAddress = {
          address_line1: addr.address_line1,
          address_line2: addr.address_line2,
          city: addr.city,
          state: addr.state,
          postal_code: addr.postal_code,
          country: addr.country,
        };
      }

      if (!resolvedAddress) {
        throw new AppError('A valid shipping address is required for checkout', 400);
      }

      // 3. Verify stock, active state, and calculate subtotal with row locks (FOR UPDATE)
      let subtotal = 0;
      const verifiedItems = [];

      for (const item of cartItems) {
        const prodRes = await client.query(
          'SELECT id, name, price, stock_quantity, is_active FROM products WHERE id = $1 FOR UPDATE',
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

        const linePrice = Number(product.price);
        subtotal += linePrice * item.quantity;

        verifiedItems.push({
          product_id: product.id,
          name: product.name,
          price: linePrice,
          quantity: item.quantity,
        });
      }

      const shippingFee = Number(checkoutData.shippingFee || 0);
      const tax = Number(checkoutData.tax || 0);
      const total = Number((subtotal + shippingFee + tax).toFixed(2));
      subtotal = Number(subtotal.toFixed(2));

      // 4. Create Order record
      const order = await orderRepository.createOrder(client, {
        userId,
        subtotal,
        tax,
        shippingFee,
        total,
        shippingAddress: resolvedAddress,
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
   * Get single order by ID with ownership verification
   */
  async getOrderById(orderId, userId, userRole) {
    const order = await orderRepository.findOrderById(orderId);
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    if (userRole !== 'admin' && order.user_id !== userId) {
      throw new AppError('You do not have permission to view this order', 403);
    }

    const items = await orderRepository.findOrderItems(orderId);
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
