import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import validate, { validateIdParam } from '../../middleware/validate.js';
import { stockController } from './stock.controller.js';
import { recordMovementSchema } from './stock.validation.js';

// Mounted at /products/:id/stock-movements; mergeParams makes :id from the parent path visible here
const router = Router({ mergeParams: true });

// The stock history is internal data: admins only
router.use(authenticate, authorize('admin'), validateIdParam);

router.get('/', stockController.list);
router.post('/', validate(recordMovementSchema), stockController.record);

export default router;
