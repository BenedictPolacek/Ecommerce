import { z } from 'zod';
import { SLUG_REGEX } from '../../utils/slug.js';
import { requiredString } from '../../utils/zod.js';

export const createCategorySchema = z.object({
  name: requiredString('Category name is required')
    .trim()
    .min(1, 'Category name cannot be empty')
    .max(100, 'Category name cannot exceed 100 characters'),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug cannot be empty')
    .max(100, 'Slug cannot exceed 100 characters')
    .regex(SLUG_REGEX, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional(),
  parent_id: z.uuid('parent_id must be a valid UUID').optional().nullable(),
});

export const updateCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Category name cannot be empty')
      .max(100, 'Category name cannot exceed 100 characters')
      .optional(),
    slug: z
      .string()
      .trim()
      .min(1, 'Slug cannot be empty')
      .max(100, 'Slug cannot exceed 100 characters')
      .regex(SLUG_REGEX, 'Slug must be lowercase alphanumeric with hyphens')
      .optional(),
    description: z.string().trim().max(500, 'Description cannot exceed 500 characters').optional(),
    parent_id: z.uuid('parent_id must be a valid UUID').optional().nullable(),
  })
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    error: 'Please provide at least one field (name, slug, description or parent_id) to update',
  });

export const categoryQuerySchema = z.object({
  tree: z
    .enum(['true', 'false'], { error: 'tree must be "true" or "false"' })
    .optional()
    .transform((value) => value === 'true'),
});

export default { createCategorySchema, updateCategorySchema, categoryQuerySchema };
