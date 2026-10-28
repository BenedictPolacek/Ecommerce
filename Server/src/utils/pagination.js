import { z } from 'zod';

// Query params arrive as strings. Zod 4 returns .default() values as-is (no transform),
// so defaults are numbers here.
export const paginationQuery = {
  page: z
    .string()
    .regex(/^\d+$/, 'page must be a positive integer')
    .transform(Number)
    .refine((n) => n >= 1, 'page must be at least 1')
    .default(1),
  limit: z
    .string()
    .regex(/^\d+$/, 'limit must be a positive integer')
    .transform(Number)
    .refine((n) => n >= 1 && n <= 100, 'limit must be between 1 and 100')
    .default(20),
};

export const toOffset = ({ page, limit }) => (page - 1) * limit;

/**
 * Pagination metadata returned next to every paginated list
 */
export const paginationMeta = ({ page, limit }, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});
