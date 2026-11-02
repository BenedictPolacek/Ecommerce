import type { ReactNode } from 'react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { FieldError } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { NEW_ADDRESS } from '../schemas';
import type { Address } from '../types';
import { AddressBlock } from './AddressBlock';
import { AddressFormFields } from './AddressFormFields';

interface AddressPickerProps {
  /** Form field holding the choice (address id or NEW_ADDRESS) */
  choiceName: string;
  /** Form object with the fields of a new address */
  addressName: string;
  label: string;
  addresses: Address[];
  /** Extra controls under the new-address fields, e.g. "save for later" */
  newAddressExtra?: ReactNode;
}

/** Choose one of the saved addresses or enter a new one */
export function AddressPicker({
  choiceName,
  addressName,
  label,
  addresses,
  newAddressExtra,
}: AddressPickerProps) {
  const { control } = useFormContext();
  const choice = useWatch({ control, name: choiceName });

  return (
    <div className="flex flex-col gap-4">
      {addresses.length > 0 && (
        <Controller
          control={control}
          name={choiceName}
          render={({ field, fieldState }) => (
            <>
              <RadioGroup
                aria-label={label}
                value={field.value}
                onValueChange={field.onChange}
                className="gap-3"
              >
                {[...addresses.map((a) => a.id), NEW_ADDRESS].map((value) => {
                  const address = addresses.find((a) => a.id === value);
                  const id = `${choiceName}-${value}`;
                  return (
                    <Label
                      key={value}
                      htmlFor={id}
                      className="has-[[data-state=checked]]:border-primary flex cursor-pointer items-start gap-3 rounded-md border p-4 font-normal"
                    >
                      <RadioGroupItem value={value} id={id} className="mt-0.5" />
                      {address ? (
                        <span className="flex flex-col gap-1">
                          <AddressBlock address={address} />
                          {address.is_default && (
                            <span className="text-muted-foreground text-xs">Default address</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-sm">Use a new address</span>
                      )}
                    </Label>
                  );
                })}
              </RadioGroup>
              <FieldError errors={[fieldState.error]} />
            </>
          )}
        />
      )}

      {(choice === NEW_ADDRESS || addresses.length === 0) && (
        <div className="flex flex-col gap-4">
          <AddressFormFields name={addressName} />
          {newAddressExtra}
        </div>
      )}
    </div>
  );
}
