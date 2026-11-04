import { z } from 'zod';
import type { Product } from '@/features/products/types';
import { centsToAmount, parseAmountToCents } from '@/lib/format';

// Mirrors Server/src/modules/products/product.validation.js and utils/slug.js (UX only)
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** All inputs are strings (or a checkbox); the output has cents and numbers */
export const productFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Product name is required')
    .max(255, 'Product name cannot exceed 255 characters'),
  // Empty = generated from the name (new product) or unchanged (existing product)
  slug: z
    .string()
    .trim()
    .max(255, 'Slug cannot exceed 255 characters')
    .refine((slug) => slug === '' || SLUG_REGEX.test(slug), {
      message: 'Only lowercase letters, digits and single hyphens, e.g. desk-lamp',
    }),
  sku: z.string().trim().max(64, 'SKU cannot exceed 64 characters'),
  description: z.string().trim().max(5000, 'Description cannot exceed 5000 characters'),
  price: z.string().transform((value, ctx) => {
    const cents = parseAmountToCents(value);
    if (cents === null) {
      ctx.addIssue({ code: 'custom', message: 'Enter a price like 19.99' });
      return z.NEVER;
    }
    return cents;
  }),
  // '' = no category
  category_id: z.string(),
  // Only used when creating; afterwards stock changes are stock movements
  stock_quantity: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Enter a whole number, 0 or more')
    .transform(Number),
  is_active: z.boolean(),
});

export type ProductFormIn = z.input<typeof productFormSchema>;
export type ProductFormOut = z.output<typeof productFormSchema>;

export const emptyProductForm: ProductFormIn = {
  name: '',
  slug: '',
  sku: '',
  description: '',
  price: '',
  category_id: '',
  stock_quantity: '0',
  // New products are hidden from the shop until they are ready
  is_active: false,
};

export const toProductForm = (product: Product): ProductFormIn => ({
  name: product.name,
  slug: product.slug,
  sku: product.sku ?? '',
  description: product.description ?? '',
  price: centsToAmount(product.price_cents),
  category_id: product.category_id ?? '',
  stock_quantity: String(product.stock_quantity),
  is_active: product.is_active,
});
