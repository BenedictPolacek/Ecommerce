import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormAlert } from '@/components/form/FormAlert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { getErrorMessage } from '@/lib/form-errors';
import { useCreateAddress, useUpdateAddress } from '../hooks';
import { addressSchema, emptyAddress, type AddressFormValues } from '../schemas';
import type { Address } from '../types';
import { AddressFormFields } from './AddressFormFields';

const addressBookSchema = z.object({ address: addressSchema, is_default: z.boolean() });

/** Form values (strings) in, cleaned values (empty optional fields = null) out */
type FormIn = z.input<typeof addressBookSchema>;
type FormOut = z.output<typeof addressBookSchema>;

const toFormValues = (address: Address): AddressFormValues => ({
  address_line1: address.address_line1,
  address_line2: address.address_line2 ?? '',
  postal_code: address.postal_code,
  city: address.city,
  state: address.state ?? '',
  country: address.country,
});

interface AddressFormProps {
  /** Edit this address; without it a new one is created */
  address?: Address;
  /** Preselect "default" (e.g. for the very first address) */
  defaultChecked?: boolean;
  onSaved: () => void;
  onCancel: () => void;
}

export function AddressForm({
  address,
  defaultChecked = false,
  onSaved,
  onCancel,
}: AddressFormProps) {
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(addressBookSchema),
    defaultValues: {
      address: address ? toFormValues(address) : emptyAddress,
      is_default: address?.is_default ?? defaultChecked,
    },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ address: fields, is_default }) => {
    try {
      if (address) {
        await updateAddress.mutateAsync({ id: address.id, ...fields, is_default });
      } else {
        await createAddress.mutateAsync({ ...fields, is_default });
      }
      onSaved();
    } catch (error) {
      form.setError('root.server', { type: 'server', message: getErrorMessage(error) });
    }
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <FormAlert message={errors.root?.server?.message} />
        <AddressFormFields name="address" />
        <Controller
          control={form.control}
          name="is_default"
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_default"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
              <Label htmlFor="is_default" className="font-normal">
                Use as default address
              </Label>
            </div>
          )}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save address'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
