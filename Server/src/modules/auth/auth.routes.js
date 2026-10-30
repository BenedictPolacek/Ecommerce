import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authLimiter } from '../../middleware/rateLimit.js';
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

// authLimiter comes first, so invalid attempts count as well
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshTokenBodySchema), authController.refresh);
// No authenticate: logging out must also work with an expired access token
router.post('/logout', validate(refreshTokenBodySchema), authController.logout);

// Session management (own sessions only)
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/sessions', authenticate, authController.listSessions);
router.delete('/sessions/:id', authenticate, validateIdParam, authController.endSession);

// Email links. No authenticate: the link may be opened on another device or logged out
router.post('/verify-email', authLimiter, validate(verifyEmailSchema), authController.verifyEmail);
router.post('/verify-email/resend', authenticate, authController.resendVerification);
router.post(
  '/forgot-password',
  authLimiter,
  validate(forgotPasswordSchema),
  authController.forgotPassword
);
router.post(
  '/reset-password',
  authLimiter,
  validate(resetPasswordSchema),
  authController.resetPassword
);

export default router;
