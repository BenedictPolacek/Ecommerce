import { z } from 'zod';

// Mirrors Server/src/modules/auth/auth.validation.js. Client checks are only for quick
// feedback; the server stays the source of truth and its errors are shown as well.

const email = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .pipe(z.email('Please provide a valid email address'));

export const PASSWORD_MIN_LENGTH = 6;

const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required'),
  last_name: z.string().trim().min(1, 'Last name is required'),
  email,
  password: newPassword,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password: newPassword,
    // Only on the client: catches typos, because the user cannot see the password
    confirmPassword: z.string().min(1, 'Please repeat the password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
