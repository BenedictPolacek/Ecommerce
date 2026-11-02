import { z } from 'zod';
import { addressSchema, NEW_ADDRESS } from '@/features/addresses/schemas';

// The raw form fields; they are only validated when a new address is chosen (see below)
const addressFormFields = z.object({
  address_line1: z.string(),
  address_line2: z.string(),
  postal_code: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
});

export const checkoutSchema = z
  .object({
    shippingChoice: z.string().min(1, 'Please choose a shipping address'),
    shipping: addressFormFields,
    saveShipping: z.boolean(),
    billingSame: z.boolean(),
    billingChoice: z.string(),
    billing: addressFormFields,
  })
  .superRefine((values, ctx) => {
    // Conditional validation: a saved address needs no checks, a new one must be complete
    const check = (address: unknown, path: 'shipping' | 'billing') => {
      const result = addressSchema.safeParse(address);
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({ code: 'custom', message: issue.message, path: [path, ...issue.path] });
        }
      }
    };

    if (values.shippingChoice === NEW_ADDRESS) check(values.shipping, 'shipping');
    if (!values.billingSame) {
      if (!values.billingChoice) {
        ctx.addIssue({
          code: 'custom',
          message: 'Please choose a billing address',
          path: ['billingChoice'],
        });
      } else if (values.billingChoice === NEW_ADDRESS) {
        check(values.billing, 'billing');
      }
    }
  });

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
