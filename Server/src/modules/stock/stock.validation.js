import { z } from 'zod';
import { requiredNumber } from '../../utils/zod.js';
import { paginationQuery } from '../../utils/pagination.js';

// Reasons an admin may choose; initial, sale and order_cancelled are only created by the system
export const MANUAL_REASONS = ['restock', 'damage', 'adjustment'];

export const recordMovementSchema = z
  .object({
    reason: z.enum(MANUAL_REASONS, {
      error: `reason must be one of: ${MANUAL_REASONS.join(', ')}`,
    }),
    // Signed: +50 for a restock, -3 for damage
    quantity: requiredNumber('quantity is required', 'quantity must be a number')
      .int('quantity must be a whole number')
      .refine((q) => q !== 0, 'quantity cannot be 0'),
    note: z.string().trim().min(1).max(500).optional(),
  })
  .refine((data) => data.reason !== 'restock' || data.quantity > 0, {
    error: 'A restock must have a positive quantity',
    path: ['quantity'],
  })
  .refine((data) => data.reason !== 'damage' || data.quantity < 0, {
    error: 'Damage must have a negative quantity',
    path: ['quantity'],
  });

export const movementListQuerySchema = z.object(paginationQuery);

export default { recordMovementSchema, movementListQuerySchema };
