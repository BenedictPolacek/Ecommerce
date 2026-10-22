import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import validate, { validateIdParam } from '../../middleware/validate.js';
import * as controller from './orders.controller.js';
import { checkoutSchema, updateOrderStatusSchema } from './orders.validation.js';

const router = Router();

// All order endpoints require authentication
router.use(authenticate);

// Checkout (create order from cart)
router.post('/', validate(checkoutSchema), controller.checkout);

// Get current user's order history
router.get('/', controller.listMyOrders);

// Admin: Get all orders across the platform
router.get('/all', authorize('admin'), controller.listAllOrders);

// Get single order details (owner or admin)
router.get('/:id', validateIdParam, controller.getOrder);

// Admin: Update order status
router.patch('/:id/status', authorize('admin'), validateIdParam, validate(updateOrderStatusSchema), controller.updateStatus);

export default router;