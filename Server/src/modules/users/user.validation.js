import { z } from 'zod';
import { requiredString } from '../../utils/zod.js';
import { passwordSchema } from '../auth/auth.validation.js';

export const updateProfileSchema = z
  .object({
    first_name: z.string().trim().min(1, 'First name cannot be empty').optional(),
    last_name: z.string().trim().min(1, 'Last name cannot be empty').optional(),
  })
  .refine((data) => data.first_name !== undefined || data.last_name !== undefined, {
    error: 'Please provide at least first_name or last_name to update',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: requiredString('Current password is required').min(
      1,
      'Current password is required'
    ),
    newPassword: passwordSchema,
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    error: 'New password must be different from the current password',
    path: ['newPassword'],
  });

// Express 5: a DELETE without body has req.body undefined; prefault turns that into {}
export const deleteAccountSchema = z
  .object({
    password: requiredString('Password is required').min(1, 'Password is required'),
  })
  .prefault({});

export default { updateProfileSchema, changePasswordSchema, deleteAccountSchema };
