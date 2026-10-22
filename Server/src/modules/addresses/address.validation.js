import { z } from 'zod';

export const createAddressSchema = z.object({
  address_line1: z
    .string({ required_error: 'address_line1 is required' })
    .trim()
    .min(1, 'Address line 1 cannot be empty')
    .max(255, 'Address line 1 cannot exceed 255 characters'),
  address_line2: z.string().trim().max(255).optional().nullable(),
  city: z
    .string({ required_error: 'city is required' })
    .trim()
    .min(1, 'City cannot be empty')
    .max(100, 'City cannot exceed 100 characters'),
  state: z.string().trim().max(100).optional().nullable(),
  postal_code: z
    .string({ required_error: 'postal_code is required' })
    .trim()
    .min(1, 'Postal code cannot be empty')
    .max(20, 'Postal code cannot exceed 20 characters'),
  country: z
    .string({ required_error: 'country is required' })
    .trim()
    .length(2, 'Country code must be exactly 2 characters (e.g. US, DE, SK)'),
  is_default: z.boolean().optional().default(false),
});

export const updateAddressSchema = z
  .object({
    address_line1: z.string().trim().min(1).max(255).optional(),
    address_line2: z.string().trim().max(255).optional().nullable(),
    city: z.string().trim().min(1).max(100).optional(),
    state: z.string().trim().max(100).optional().nullable(),
    postal_code: z.string().trim().min(1).max(20).optional(),
    country: z.string().trim().length(2).optional(),
    is_default: z.boolean().optional(),
  })
  .refine(
    (data) => Object.values(data).some((val) => val !== undefined),
    { message: 'Please provide at least one field to update' }
  );

export default { createAddressSchema, updateAddressSchema };
