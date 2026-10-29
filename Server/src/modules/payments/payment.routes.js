import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import validate, { validateIdParam } from '../../middleware/validate.js';
import { paymentController } from './payment.controller.js';
import { recordPaymentSchema } from './payment.validation.js';

// Mounted at /orders/:id/payments; mergeParams makes :id from the parent path visible here
const router = Router({ mergeParams: true });

router.use(authenticate);

// Admin: record a payment that arrived outside a provider integration (e.g. bank transfer)
router.post(
  '/',
  authorize('admin'),
  validateIdParam,
  validate(recordPaymentSchema),
  paymentController.record
);

export default router;
