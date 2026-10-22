import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid email address')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters long'),
  first_name: z
    .string({ required_error: 'First name is required' })
    .trim()
    .min(1, 'First name cannot be empty'),
  last_name: z
    .string({ required_error: 'Last name is required' })
    .trim()
    .min(1, 'Last name cannot be empty'),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid email address')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

export default { registerSchema, loginSchema };
