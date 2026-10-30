import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate, validateIdParam } from '../../middleware/validate.js';
import { authController } from './auth.controller.js';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshTokenBodySchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from './auth.validation.js';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenBodySchema), authController.refresh);
// No authenticate: logging out must also work with an expired access token
router.post('/logout', validate(refreshTokenBodySchema), authController.logout);

// Session management (own sessions only)
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/sessions', authenticate, authController.listSessions);
router.delete('/sessions/:id', authenticate, validateIdParam, authController.endSession);

// Email links. No authenticate: the link may be opened on another device or logged out
router.post('/verify-email', validate(verifyEmailSchema), authController.verifyEmail);
router.post('/verify-email/resend', authenticate, authController.resendVerification);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

export default router;
