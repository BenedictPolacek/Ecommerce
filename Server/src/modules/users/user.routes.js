import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { userController } from './user.controller.js';
import { updateProfileSchema } from './user.validation.js';

const router = Router();

// All user routes require authentication
router.use(authenticate);

router.get('/me', userController.getMe);
router.patch('/me', validate(updateProfileSchema), userController.updateMe);

export default router;