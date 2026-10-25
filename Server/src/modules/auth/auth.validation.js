import { z } from 'zod';
import { requiredString } from '../../utils/zod.js';

// Trim and lowercase first, then check the format of the cleaned value
const emailSchema = requiredString('Email is required')
  .trim()
  .toLowerCase()
  .pipe(z.email('Please provide a valid email address'));

export const registerSchema = z.object({
  email: emailSchema,
  password: requiredString('Password is required').min(
    6,
    'Password must be at least 6 characters long'
  ),
  first_name: requiredString('First name is required').trim().min(1, 'First name cannot be empty'),
  last_name: requiredString('Last name is required').trim().min(1, 'Last name cannot be empty'),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: requiredString('Password is required').min(1, 'Password is required'),
});

export default { registerSchema, loginSchema };
