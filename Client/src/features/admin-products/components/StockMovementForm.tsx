import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormAlert } from '@/components/form/FormAlert';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/button';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { setServerErrors } from '@/lib/form-errors';
import { useRecordStockMovement } from '../hooks';
import { formatStockChange, MANUAL_REASONS, STOCK_REASON } from '../stock';

// Mirrors Server/src/modules/stock/stock.validation.js (UX only, the server decides)
const movementSchema = z
  .object({
    reason: z.enum(['restock', 'damage', 'adjustment']),
    quantity: z.string().trim(),
    note: z.string().trim().max(500, 'Note cannot exceed 500 characters'),
  })
  .transform((values, ctx) => {
    // Restock and damage are typed as positive units, the sign comes from the reason
    const signed = values.reason === 'adjustment' ? /^[+-]?\d+$/ : /^\d+$/;
    const units = signed.test(values.quantity) ? Number(values.quantity) : NaN;
    if (!Number.isInteger(units) || units === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['quantity'],
        message:
          values.reason === 'adjustment'
            ? 'Enter a whole number other than 0, e.g. 5 or -5'
            : 'Enter a whole number greater than 0',
      });
      return z.NEVER;
    }
    return { ...values, quantity: values.reason === 'damage' ? -units : units };
  });

type FormIn = z.input<typeof movementSchema>;
type FormOut = z.output<typeof movementSchema>;

const EMPTY: FormIn = { reason: 'restock', quantity: '', note: '' };

/** Book a restock (+), damage (-) or adjustment (+/-) */
export function StockMovementForm({ productId }: { productId: string }) {
  const record = useRecordStockMovement();
  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(movementSchema),
    defaultValues: EMPTY,
  });
  const { errors, isSubmitting } = form.formState;
  const reason = useWatch({ control: form.control, name: 'reason' });
  const quantityLabel = MANUAL_REASONS.find((r) => r.value === reason)?.quantityLabel ?? 'Units';

  const onSubmit = form.handleSubmit(async ({ reason, quantity, note }) => {
    try {
      await record.mutateAsync({ productId, reason, quantity, note: note || undefined });
      form.reset(EMPTY);
      toast.success(`${STOCK_REASON[reason]} booked: ${formatStockChange(quantity)}`);
    } catch (error) {
      // 409 "Stock cannot go below 0" has no field: shown above the form
      setServerErrors(error, form.setError, ['quantity', 'note']);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby="movement-title">
      <FieldGroup>
        <h4 id="movement-title" className="font-medium">
          Book a stock movement
        </h4>
        <FormAlert message={errors.root?.server?.message} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="movement-reason">Reason</FieldLabel>
            <select
              id="movement-reason"
              className="border-input h-9 rounded-md border bg-transparent px-3 text-sm shadow-xs"
              {...form.register('reason')}
            >
              {MANUAL_REASONS.map(({ value }) => (
                <option key={value} value={value}>
                  {STOCK_REASON[value]}
                </option>
              ))}
            </select>
          </Field>
          <TextField
            id="movement-quantity"
            label={quantityLabel}
            inputMode="numeric"
            autoComplete="off"
            error={errors.quantity}
            {...form.register('quantity')}
          />
        </div>
        <TextField
          id="movement-note"
          label="Note (optional)"
          placeholder="E.g. delivery note number"
          autoComplete="off"
          error={errors.note}
          {...form.register('note')}
        />
        <Button type="submit" variant="outline" className="self-start" disabled={isSubmitting}>
          {isSubmitting ? 'Booking…' : 'Book movement'}
        </Button>
      </FieldGroup>
    </form>
  );
}
