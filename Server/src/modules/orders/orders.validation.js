import { z } from 'zod';
import { paginationQuery } from '../../utils/pagination.js';

export const shippingAddressSchema = z.object({
  address_line1: z.string().trim().min(1, 'Address line 1 is required').max(255),
  address_line2: z.string().trim().max(255).optional().nullable(),
  city: z.string().trim().min(1, 'City is required').max(100),
  state: z.string().trim().max(100).optional().nullable(),
  postal_code: z.string().trim().min(1, 'Postal code is required').max(20),
  country: z.string().trim().min(2, 'Country code must be 2 uppercase characters').max(2),
});

export const checkoutSchema = z
  .object({
    shippingAddress: shippingAddressSchema.optional(),
    addressId: z.uuid('Invalid address UUID').optional(),
    // Optional: without one, the billing address is the shipping address
    billingAddress: shippingAddressSchema.optional(),
    billingAddressId: z.uuid('Invalid billing address UUID').optional(),
    paymentProvider: z.string().trim().max(50).optional(),
    paymentId: z.string().trim().max(255).optional(),
  })
  .refine((data) => data.shippingAddress !== undefined || data.addressId !== undefined, {
    error: 'Please provide either a shippingAddress object or an existing addressId',
  });

export const orderStatusEnum = z.enum([
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]);

export const updateOrderStatusSchema = z.object({
  status: orderStatusEnum,
});

export const orderListQuerySchema = z.object({
  status: orderStatusEnum.optional(),
  ...paginationQuery,
});

export const orderIdParamSchema = z.object({
  id: z.uuid('Invalid order ID format (must be a valid UUID)'),
});

export default {
  shippingAddressSchema,
  checkoutSchema,
  orderStatusEnum,
  updateOrderStatusSchema,
  orderIdParamSchema,
};
