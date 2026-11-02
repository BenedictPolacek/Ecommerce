import { useFormContext, type FieldError as FormFieldError } from 'react-hook-form';
import { TextField } from '@/components/form/TextField';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { COUNTRIES } from '../schemas';

type AddressField =
  'address_line1' | 'address_line2' | 'postal_code' | 'city' | 'state' | 'country';

/**
 * The inputs of one address inside a bigger form (react-hook-form FormProvider).
 * `name` is the object in the form values, e.g. "shipping" -> shipping.city
 */
export function AddressFormFields({ name }: { name: string }) {
  const { register, getFieldState, formState } = useFormContext();
  const field = (key: AddressField) => `${name}.${key}`;
  const errorOf = (key: AddressField) =>
    getFieldState(field(key), formState).error as FormFieldError | undefined;
  const id = (key: AddressField) => `${name}-${key}`;
  // Autofill tokens: "shipping"/"billing" are valid section names, anything else is not
  const section = name === 'shipping' || name === 'billing' ? `${name} ` : '';

  return (
    <div className="grid gap-4 sm:grid-cols-6">
      <div className="sm:col-span-6">
        <TextField
          id={id('address_line1')}
          label="Street and number"
          autoComplete={`${section}address-line1`}
          error={errorOf('address_line1')}
          {...register(field('address_line1'))}
        />
      </div>
      <div className="sm:col-span-6">
        <TextField
          id={id('address_line2')}
          label="Address line 2 (optional)"
          autoComplete={`${section}address-line2`}
          error={errorOf('address_line2')}
          {...register(field('address_line2'))}
        />
      </div>
      <div className="sm:col-span-2">
        <TextField
          id={id('postal_code')}
          label="Postal code"
          autoComplete={`${section}postal-code`}
          error={errorOf('postal_code')}
          {...register(field('postal_code'))}
        />
      </div>
      <div className="sm:col-span-4">
        <TextField
          id={id('city')}
          label="City"
          autoComplete={`${section}address-level2`}
          error={errorOf('city')}
          {...register(field('city'))}
        />
      </div>
      <div className="sm:col-span-3">
        <TextField
          id={id('state')}
          label="State / region (optional)"
          autoComplete={`${section}address-level1`}
          error={errorOf('state')}
          {...register(field('state'))}
        />
      </div>
      <div className="sm:col-span-3">
        <Field data-invalid={!!errorOf('country')}>
          <FieldLabel htmlFor={id('country')}>Country</FieldLabel>
          {/* Native select: accessible and works with autofill without extra code */}
          <select
            id={id('country')}
            autoComplete={`${section}country`}
            className="border-input h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs"
            {...register(field('country'))}
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
          <FieldError errors={[errorOf('country')]} />
        </Field>
      </div>
    </div>
  );
}
