import { z } from 'zod';
import type { CategoryNode } from '@/features/categories/types';

// Mirrors Server/src/modules/categories/category.validation.js and utils/slug.js (UX only)
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Category name is required')
    .max(100, 'Category name cannot exceed 100 characters'),
  // Empty = generated from the name (new category) or unchanged (existing category)
  slug: z
    .string()
    .trim()
    .max(100, 'Slug cannot exceed 100 characters')
    .refine((slug) => slug === '' || SLUG_REGEX.test(slug), {
      message: 'Only lowercase letters, digits and single hyphens, e.g. desk-lamps',
    }),
  description: z.string().trim().max(500, 'Description cannot exceed 500 characters'),
  // '' = top level
  parent_id: z.string(),
});

export type CategoryForm = z.infer<typeof categoryFormSchema>;

export const toCategoryForm = (category: CategoryNode): CategoryForm => ({
  name: category.name,
  slug: category.slug,
  description: category.description ?? '',
  parent_id: category.parent_id ?? '',
});
