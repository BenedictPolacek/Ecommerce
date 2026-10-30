import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth.js';
import { validate, validateIdParam } from '../../middleware/validate.js';
import { userController } from './user.controller.js';
import {
  changePasswordSchema,
  deleteAccountSchema,
  updateProfileSchema,
} from './user.validation.js';

const router = Router();

// All user routes require authentication
router.use(authenticate);

router.get('/me', userController.getMe);
router.patch('/me', validate(updateProfileSchema), userController.updateMe);
router.patch('/me/password', validate(changePasswordSchema), userController.changePassword);
router.delete('/me', validate(deleteAccountSchema), userController.deleteMe);

// Admin: delete a customer (e.g. a deletion request by email or phone)
router.delete('/:id', authorize('admin'), validateIdParam, userController.deleteUser);

export default router;
