import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form';
import { FormAlert } from '@/components/form/FormAlert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { AddressPicker } from '@/features/addresses/components/AddressPicker';
import { useCreateAddress } from '@/features/addresses/hooks';
import { addressSchema, emptyAddress, NEW_ADDRESS } from '@/features/addresses/schemas';
import type { Address } from '@/features/addresses/types';
import { getErrorMessage } from '@/lib/form-errors';
import { formatPrice } from '@/lib/format';
import { checkoutSchema, type CheckoutFormValues } from '../checkout-schema';
import { usePlaceOrder } from '../hooks';
import type { CheckoutInput, Order } from '../types';

interface CheckoutFormProps {
  addresses: Address[];
  totalCents: number;
  /** False while the email is not verified: the server would refuse the order */
  canOrder: boolean;
  onSuccess: (order: Order) => void;
}

export function CheckoutForm({ addresses, totalCents, canOrder, onSuccess }: CheckoutFormProps) {
  const createAddress = useCreateAddress();
  const placeOrder = usePlaceOrder();

  const preselected = addresses.find((a) => a.is_default) ?? addresses[0];
  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shippingChoice: preselected?.id ?? NEW_ADDRESS,
      shipping: emptyAddress,
      saveShipping: true,
      billingSame: true,
      // Without saved addresses there is nothing to choose: go straight to the form
      billingChoice: addresses.length === 0 ? NEW_ADDRESS : '',
      billing: emptyAddress,
    },
  });
  const { errors, isSubmitting } = form.formState;
  // useWatch instead of form.watch(): works with the React Compiler's automatic memoization
  const billingSame = useWatch({ control: form.control, name: 'billingSame' });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const input: CheckoutInput = {};

      if (values.shippingChoice !== NEW_ADDRESS) {
        input.addressId = values.shippingChoice;
      } else if (values.saveShipping) {
        // Save first, then order with the saved address. The first address becomes the default.
        const saved = await createAddress.mutateAsync({
          ...addressSchema.parse(values.shipping),
          is_default: addresses.length === 0,
        });
        input.addressId = saved.id;
        // If the order fails now, a retry must not save the same address a second time
        form.setValue('shippingChoice', saved.id);
        form.setValue('saveShipping', false);
      } else {
        input.shippingAddress = addressSchema.parse(values.shipping);
      }

      if (!values.billingSame) {
        if (values.billingChoice === NEW_ADDRESS) {
          input.billingAddress = addressSchema.parse(values.billing);
        } else {
          input.billingAddressId = values.billingChoice;
        }
      }

      onSuccess(await placeOrder.mutateAsync(input));
    } catch (error) {
      // e.g. "Product X is no longer available", 403 email not verified
      form.setError('root.server', { type: 'server', message: getErrorMessage(error) });
    }
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-8">
        <section aria-labelledby="shipping-title" className="flex flex-col gap-4">
          <h2 id="shipping-title" className="text-lg font-semibold">
            Shipping address
          </h2>
          <AddressPicker
            choiceName="shippingChoice"
            addressName="shipping"
            label="Shipping address"
            addresses={addresses}
            newAddressExtra={
              <CheckboxField name="saveShipping" label="Save this address for future orders" />
            }
          />
        </section>

        <section aria-labelledby="billing-title" className="flex flex-col gap-4">
          <h2 id="billing-title" className="text-lg font-semibold">
            Billing address
          </h2>
          <CheckboxField name="billingSame" label="Same as shipping address" />
          {!billingSame && (
            <AddressPicker
              choiceName="billingChoice"
              addressName="billing"
              label="Billing address"
              addresses={addresses}
            />
          )}
        </section>

        <section aria-labelledby="payment-title" className="flex flex-col gap-2">
          <h2 id="payment-title" className="text-lg font-semibold">
            Payment
          </h2>
          <div className="rounded-md border p-4 text-sm">
            <p className="font-medium">Prepayment by bank transfer</p>
            <p className="text-muted-foreground">
              After placing the order you will see our bank details. We ship as soon as your payment
              has arrived.
            </p>
          </div>
        </section>

        <div className="flex flex-col gap-3">
          <FormAlert message={errors.root?.server?.message} />
          <Button type="submit" size="lg" disabled={isSubmitting || !canOrder}>
            {isSubmitting ? 'Placing order…' : `Place order · ${formatPrice(totalCents)}`}
          </Button>
          <p className="text-muted-foreground text-xs">
            By placing the order you agree to pay the total amount by bank transfer.
          </p>
        </div>
      </form>
    </FormProvider>
  );
}

function CheckboxField({ name, label }: { name: 'saveShipping' | 'billingSame'; label: string }) {
  return (
    <Controller<CheckoutFormValues>
      name={name}
      render={({ field }) => (
        <div className="flex items-center gap-2">
          <Checkbox
            id={name}
            checked={field.value === true}
            onCheckedChange={(checked) => field.onChange(checked === true)}
          />
          <Label htmlFor={name} className="font-normal">
            {label}
          </Label>
        </div>
      )}
    />
  );
}
