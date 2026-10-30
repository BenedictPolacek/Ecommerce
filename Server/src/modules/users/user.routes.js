import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { userController } from './user.controller.js';
import { changePasswordSchema, updateProfileSchema } from './user.validation.js';

const router = Router();

// All user routes require authentication
router.use(authenticate);

router.get('/me', userController.getMe);
router.patch('/me', validate(updateProfileSchema), userController.updateMe);
router.patch('/me/password', validate(changePasswordSchema), userController.changePassword);

export default router;
