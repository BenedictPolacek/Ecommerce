import { z } from 'zod';

// prefault: an empty request (no body at all) is parsed as {}, so the defaults below apply
export const recordPaymentSchema = z
  .object({
    // Lowercase identifier like 'manual', 'paypal', 'bank_transfer'
    provider: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9_]+$/, 'Provider may only contain letters, digits and underscores')
      .max(50)
      .default('manual'),
    // E.g. the bank transfer reference
    providerPaymentId: z.string().trim().min(1).max(255).optional(),
    // Without an amount, the outstanding balance of the order is recorded
    amountCents: z.number().int('Amount must be in whole cents').positive().optional(),
  })
  .prefault({});

export default { recordPaymentSchema };
