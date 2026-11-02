import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from '@/features/auth/schemas';

// Mirrors Server/src/modules/users/user.validation.js (UX only, the server decides)

export const profileSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required'),
  last_name: z.string().trim().min(1, 'Last name is required'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`),
    confirmPassword: z.string().min(1, 'Please repeat the new password'),
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: 'New password must be different from the current password',
    path: ['newPassword'],
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ProfileInput = z.infer<typeof profileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
