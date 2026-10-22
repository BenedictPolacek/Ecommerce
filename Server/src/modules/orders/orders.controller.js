import { catchAsync } from '../../utils/catchAsync.js';
import { orderService } from './orders.service.js';

export const ordersController = {
  /**
   * Checkout and create order from user cart
   * POST /api/orders
   */
  checkout: catchAsync(async (req, res) => {
    const order = await orderService.checkout(req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: { order },
    });
  }),

  /**
   * List all orders placed by the current user
   * GET /api/orders
   */
  listMyOrders: catchAsync(async (req, res) => {
    const orders = await orderService.getMyOrders(req.user.id);
    res.status(200).json({
      success: true,
      count: orders.length,
      data: { orders },
    });
  }),

  /**
   * List all orders in system (Admin only)
   * GET /api/orders/all
   */
  listAllOrders: catchAsync(async (req, res) => {
    const orders = await orderService.getAllOrders();
    res.status(200).json({
      success: true,
      count: orders.length,
      data: { orders },
    });
  }),

  /**
   * Get specific order details by ID
   * GET /api/orders/:id
   */
  getOrder: catchAsync(async (req, res) => {
    const id = req.idParam || req.params.id;
    const order = await orderService.getOrderById(id, req.user.id, req.user.role);
    res.status(200).json({
      success: true,
      data: { order },
    });
  }),

  /**
   * Update order status (Admin only)
   * PATCH /api/orders/:id/status
   */
  updateStatus: catchAsync(async (req, res) => {
    const id = req.idParam || req.params.id;
    const order = await orderService.updateOrderStatus(id, req.body.status);
    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: { order },
    });
  }),
};

export const { checkout, listMyOrders, listAllOrders, getOrder, updateStatus } = ordersController;
export default ordersController;
