import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import validate, { validateIdParam } from '../../middleware/validate.js';
import { addressController } from './address.controller.js';
import { createAddressSchema, updateAddressSchema } from './address.validation.js';

const router = Router();

// All address routes require authentication
router.use(authenticate);

router.get('/', addressController.getAll);
router.get('/:id', validateIdParam, addressController.getOne);
router.post('/', validate(createAddressSchema), addressController.create);
router.put('/:id', validateIdParam, validate(updateAddressSchema), addressController.update);
router.delete('/:id', validateIdParam, addressController.delete);

export default router;
