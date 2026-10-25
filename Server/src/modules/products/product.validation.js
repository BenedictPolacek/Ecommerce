import { z } from 'zod';
import { requiredNumber, requiredString } from '../../utils/zod.js';

// ─── Create ──────────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  name: requiredString('Product name is required')
    .trim()
    .min(1, 'Product name cannot be empty')
    .max(255, 'Product name cannot exceed 255 characters'),

  sku: z
    .string()
    .trim()
    .min(1, 'SKU cannot be empty')
    .max(64, 'SKU cannot exceed 64 characters')
    .optional(),

  description: z.string().trim().max(5000, 'Description cannot exceed 5000 characters').optional(),

  price: requiredNumber('Price is required', 'Price must be a number')
    .min(0, 'Price cannot be negative')
    .multipleOf(0.01, 'Price can have at most 2 decimal places'),

  stock_quantity: z
    .number({ error: 'Stock quantity must be a number' })
    .int('Stock quantity must be a whole number')
    .min(0, 'Stock quantity cannot be negative')
    .optional()
    .default(0),

  category_id: z.uuid('category_id must be a valid UUID').optional().nullable(),

  is_active: z.boolean().optional().default(true),
});

// ─── Update (all optional, at least one required) ─────────────────────────────

export const updateProductSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Product name cannot be empty')
      .max(255, 'Product name cannot exceed 255 characters')
      .optional(),

    sku: z
      .string()
      .trim()
      .min(1, 'SKU cannot be empty')
      .max(64, 'SKU cannot exceed 64 characters')
      .optional()
      .nullable(),

    description: z
      .string()
      .trim()
      .max(5000, 'Description cannot exceed 5000 characters')
      .optional()
      .nullable(),

    price: z
      .number({ error: 'Price must be a number' })
      .min(0, 'Price cannot be negative')
      .multipleOf(0.01, 'Price can have at most 2 decimal places')
      .optional(),

    stock_quantity: z
      .number({ error: 'Stock quantity must be a number' })
      .int('Stock quantity must be a whole number')
      .min(0, 'Stock quantity cannot be negative')
      .optional(),

    category_id: z.uuid('category_id must be a valid UUID').optional().nullable(),

    is_active: z.boolean().optional(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    error: 'Please provide at least one field to update',
  });

// ─── Stock update ─────────────────────────────────────────────────────────────

export const updateStockSchema = z.object({
  stock_quantity: requiredNumber('stock_quantity is required', 'Stock quantity must be a number')
    .int('Stock quantity must be a whole number')
    .min(0, 'Stock quantity cannot be negative'),
});

// ─── Query params ─────────────────────────────────────────────────────────────

// Zod 4 returns .default() values as-is (no transform), so defaults are numbers here
export const productQuerySchema = z.object({
  search: z.string().trim().optional(),
  category_id: z.uuid('category_id must be a valid UUID').optional(),
  is_active: z.enum(['true', 'false'], { error: 'is_active must be "true" or "false"' }).optional(),
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
});

export default {
  createProductSchema,
  updateProductSchema,
  updateStockSchema,
  productQuerySchema,
};
