import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import validate, { validateParams } from '../../middleware/validate.js';
import { cartController } from './cart.controller.js';
import { addItemSchema, updateItemSchema, productIdParamSchema } from './cart.validation.js';

const router = Router();

// All cart operations require authentication
router.use(authenticate);

// Get current cart
router.get('/', cartController.getCart);

// Add item to cart
router.post('/items', validate(addItemSchema), cartController.addItem);

// Update item quantity
router.put(
  '/items/:productId',
  validateParams(productIdParamSchema),
  validate(updateItemSchema),
  cartController.updateItem
);

// Remove item from cart
router.delete(
  '/items/:productId',
  validateParams(productIdParamSchema),
  cartController.removeItem
);

// Clear entire cart
router.delete('/', cartController.clearCart);

export default router;
