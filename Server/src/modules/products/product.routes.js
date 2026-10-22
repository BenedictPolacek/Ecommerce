import { Router } from 'express';
import { productController } from './product.controller.js';
import { authenticate, authorize } from '../../middleware/auth.js';
import validate, { validateIdParam } from '../../middleware/validate.js';
import {
  createProductSchema,
  updateProductSchema,
  updateStockSchema,
} from './product.validation.js';

const router = Router();

router.get('/', productController.getAll);
router.get('/:id', validateIdParam, productController.getOne);

router.post('/', authenticate, authorize('admin'), validate(createProductSchema), productController.create);
router.put('/:id', authenticate, authorize('admin'), validateIdParam, validate(updateProductSchema), productController.update);
router.patch('/:id/stock', authenticate, authorize('admin'), validateIdParam, validate(updateStockSchema), productController.updateStock);
router.delete('/:id', authenticate, authorize('admin'), validateIdParam, productController.delete);

export default router;