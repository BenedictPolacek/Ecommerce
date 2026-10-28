import { Router } from 'express';
import { productController } from './product.controller.js';
import { authenticate, authorize, optionalAuthenticate } from '../../middleware/auth.js';
import validate, { validateIdParam, validateParams } from '../../middleware/validate.js';
import {
  addImageSchema,
  createProductSchema,
  imageParamsSchema,
  reorderImagesSchema,
  updateProductSchema,
  updateStockSchema,
} from './product.validation.js';

const router = Router();

// Public, but admins (optional login) also see inactive products
router.get('/', optionalAuthenticate, productController.getAll);
// Accepts a UUID or a slug, so no UUID validation here
router.get('/:idOrSlug', optionalAuthenticate, productController.getOne);

router.post(
  '/',
  authenticate,
  authorize('admin'),
  validate(createProductSchema),
  productController.create
);
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  validateIdParam,
  validate(updateProductSchema),
  productController.update
);
router.patch(
  '/:id/stock',
  authenticate,
  authorize('admin'),
  validateIdParam,
  validate(updateStockSchema),
  productController.updateStock
);
router.delete('/:id', authenticate, authorize('admin'), validateIdParam, productController.delete);

// Images (sub-resource of a product)
router.post(
  '/:id/images',
  authenticate,
  authorize('admin'),
  validateIdParam,
  validate(addImageSchema),
  productController.addImage
);
router.put(
  '/:id/images/order',
  authenticate,
  authorize('admin'),
  validateIdParam,
  validate(reorderImagesSchema),
  productController.reorderImages
);
router.delete(
  '/:id/images/:imageId',
  authenticate,
  authorize('admin'),
  validateParams(imageParamsSchema),
  productController.deleteImage
);

export default router;
