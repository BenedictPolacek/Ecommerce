import { z } from 'zod';

export const addItemSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().positive(),
});

export const updateItemSchema = z.object({
  quantity: z.number().int().positive(),
});

export const productIdParamSchema = z.object({
  productId: z.uuid(),
});
