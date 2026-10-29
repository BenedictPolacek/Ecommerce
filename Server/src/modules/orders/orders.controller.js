import { catchAsync } from '../../utils/catchAsync.js';
import { orderService } from './orders.service.js';
import { orderListQuerySchema } from './orders.validation.js';

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
   * One page of the current user's orders
   * GET /api/orders?status=&page=&limit=
   */
  listMyOrders: catchAsync(async (req, res) => {
    const query = orderListQuerySchema.parse(req.query);
    const result = await orderService.getMyOrders(req.user.id, query);
    res.status(200).json({
      success: true,
      data: result,
    });
  }),

  /**
   * One page of all orders in the system (Admin only)
   * GET /api/orders/all?status=&page=&limit=
   */
  listAllOrders: catchAsync(async (req, res) => {
    const query = orderListQuerySchema.parse(req.query);
    const result = await orderService.getAllOrders(query);
    res.status(200).json({
      success: true,
      data: result,
    });
  }),

  /**
   * Get specific order details by ID or order number
   * GET /api/orders/:idOrNumber
   */
  getOrder: catchAsync(async (req, res) => {
    const order = await orderService.getOrderByIdOrNumber(
      req.params.idOrNumber,
      req.user.id,
      req.user.role
    );
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
    const order = await orderService.updateOrderStatus(id, req.body.status, req.user.id);
    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: { order },
    });
  }),
};

export const { checkout, listMyOrders, listAllOrders, getOrder, updateStatus } = ordersController;
export default ordersController;
