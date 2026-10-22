import { z } from 'zod';

export const updateProfileSchema = z
  .object({
    first_name: z.string().trim().min(1, 'First name cannot be empty').optional(),
    last_name: z.string().trim().min(1, 'Last name cannot be empty').optional(),
  })
  .refine((data) => data.first_name !== undefined || data.last_name !== undefined, {
    message: 'Please provide at least first_name or last_name to update',
  });

export default { updateProfileSchema };
