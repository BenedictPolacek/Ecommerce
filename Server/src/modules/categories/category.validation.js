import { z } from 'zod';

/**
 * Utility to generate URL-friendly slug from string
 */
export const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-') // Replace spaces and non-word chars with -
    .replace(/^-+|-+$/g, ''); // Trim starting/trailing dashes
};

export const createCategorySchema = z.object({
  name: z
    .string({ required_error: 'Category name is required' })
    .trim()
    .min(1, 'Category name cannot be empty')
    .max(100, 'Category name cannot exceed 100 characters'),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug cannot be empty')
    .max(100, 'Slug cannot exceed 100 characters')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
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
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
      .optional(),
    description: z
      .string()
      .trim()
      .max(500, 'Description cannot exceed 500 characters')
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.slug !== undefined || data.description !== undefined, {
    message: 'Please provide at least one field (name, slug, or description) to update',
  });

export default { slugify, createCategorySchema, updateCategorySchema };
