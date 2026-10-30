import { z } from 'zod';
import { requiredString } from '../../utils/zod.js';

// Trim and lowercase first, then check the format of the cleaned value
const emailSchema = requiredString('Email is required')
  .trim()
  .toLowerCase()
  .pipe(z.email('Please provide a valid email address'));

// Shared by register, password reset and password change, so the rules cannot drift apart
export const passwordSchema = requiredString('Password is required').min(
  6,
  'Password must be at least 6 characters long'
);

// Tokens from email links (43 characters); the max only stops absurd input
const emailTokenSchema = requiredString('Token is required').min(1, 'Token is required').max(200);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  first_name: requiredString('First name is required').trim().min(1, 'First name cannot be empty'),
  last_name: requiredString('Last name is required').trim().min(1, 'Last name cannot be empty'),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: requiredString('Password is required').min(1, 'Password is required'),
});

// Browsers send the refresh token as a cookie (empty body); other clients in the body.
// prefault: no body at all is parsed as {}
export const refreshTokenBodySchema = z
  .object({
    refreshToken: z.string().min(1).max(200).optional(),
  })
  .prefault({});

export const verifyEmailSchema = z.object({
  token: emailTokenSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: emailTokenSchema,
  password: passwordSchema,
});

export default {
  registerSchema,
  loginSchema,
  refreshTokenBodySchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
