import { z } from 'zod';
import { paginationQuery } from '../../utils/pagination.js';
import { SLUG_REGEX } from '../../utils/slug.js';
import { requiredNumber, requiredString } from '../../utils/zod.js';

// Optional on create (generated from the name) and update (kept when renaming)
const slugField = z
  .string()
  .trim()
  .min(1, 'Slug cannot be empty')
  .max(255, 'Slug cannot exceed 255 characters')
  .regex(SLUG_REGEX, 'Slug must be lowercase alphanumeric with hyphens')
  .optional();

// ─── Create ──────────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  name: requiredString('Product name is required')
    .trim()
    .min(1, 'Product name cannot be empty')
    .max(255, 'Product name cannot exceed 255 characters'),

  slug: slugField,

  sku: z
    .string()
    .trim()
    .min(1, 'SKU cannot be empty')
    .max(64, 'SKU cannot exceed 64 characters')
    .optional(),

  description: z.string().trim().max(5000, 'Description cannot exceed 5000 characters').optional(),

  // Gross price incl. VAT in cents: 1999 = 19.99 €
  price_cents: requiredNumber('price_cents is required', 'price_cents must be a number')
    .int('price_cents must be a whole number of cents')
    .min(0, 'price_cents cannot be negative'),

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

    slug: slugField,

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

    price_cents: z
      .number({ error: 'price_cents must be a number' })
      .int('price_cents must be a whole number of cents')
      .min(0, 'price_cents cannot be negative')
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

// ─── Images ───────────────────────────────────────────────────────────────────

export const addImageSchema = z.object({
  // Only http(s): no javascript: or data: URLs that could end up in an <img src>
  url: z
    .url({ protocol: /^https?$/, error: 'url must be a valid http(s) URL' })
    .max(2048, 'url cannot exceed 2048 characters'),
  alt_text: z.string().trim().max(255, 'Alt text cannot exceed 255 characters').optional(),
});

export const reorderImagesSchema = z.object({
  image_ids: z
    .array(z.uuid('image_ids must contain valid UUIDs'), { error: 'image_ids must be an array' })
    .min(1, 'image_ids cannot be empty'),
});

export const imageParamsSchema = z.object({
  id: z.uuid('Invalid product ID format (must be a valid UUID)'),
  imageId: z.uuid('Invalid image ID format (must be a valid UUID)'),
});

// ─── Query params ─────────────────────────────────────────────────────────────

export const productQuerySchema = z.object({
  search: z.string().trim().optional(),
  category_id: z.uuid('category_id must be a valid UUID').optional(),
  is_active: z.enum(['true', 'false'], { error: 'is_active must be "true" or "false"' }).optional(),
  ...paginationQuery,
});

export default {
  createProductSchema,
  updateProductSchema,
  updateStockSchema,
  productQuerySchema,
};
