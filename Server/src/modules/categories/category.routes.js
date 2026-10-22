import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { categoryController } from './category.controller.js';
import { createCategorySchema, updateCategorySchema } from './category.validation.js';

const router = Router();

// Public routes
router.get('/', categoryController.getAll);
router.get('/:id', categoryController.getOne);

// Protected Admin-only routes
router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createCategorySchema),
  categoryController.create
);

router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(updateCategorySchema),
  categoryController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  categoryController.delete
);

export default router;
