import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormAlert } from '@/components/form/FormAlert';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { setServerErrors } from '@/lib/form-errors';
import { useSetStock } from '../hooks';

const countSchema = z.object({
  count: z.string().trim().regex(/^\d+$/, 'Enter a whole number, 0 or more').transform(Number),
  note: z.string().trim().max(500, 'Note cannot exceed 500 characters'),
});

type FormIn = z.input<typeof countSchema>;
type FormOut = z.output<typeof countSchema>;

const EMPTY: FormIn = { count: '', note: '' };

interface InventoryCountFormProps {
  productId: string;
  currentStock: number;
}

/** After counting the shelf: the server books the difference as an adjustment */
export function InventoryCountForm({ productId, currentStock }: InventoryCountFormProps) {
  const setStock = useSetStock();
  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(countSchema),
    defaultValues: EMPTY,
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ count, note }) => {
    // The ledger never stores a change of 0: nothing to send
    if (count === currentStock) {
      form.reset(EMPTY);
      toast.info(`Stock already is ${count}, nothing changed`);
      return;
    }
    try {
      await setStock.mutateAsync({ productId, stock_quantity: count, note: note || undefined });
      form.reset(EMPTY);
      toast.success(`Stock set to ${count}`);
    } catch (error) {
      setServerErrors(error, form.setError, ['note']);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby="count-title">
      <FieldGroup>
        <h4 id="count-title" className="font-medium">
          Inventory count
        </h4>
        <FormAlert message={errors.root?.server?.message} />
        <TextField
          id="count"
          label="Counted stock"
          hint={`Currently ${currentStock}. The difference is booked as an adjustment.`}
          inputMode="numeric"
          autoComplete="off"
          error={errors.count}
          {...form.register('count')}
        />
        <TextField
          id="count-note"
          label="Note (optional)"
          placeholder="E.g. yearly inventory"
          autoComplete="off"
          error={errors.note}
          {...form.register('note')}
        />
        <Button type="submit" variant="outline" className="self-start" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Set stock'}
        </Button>
      </FieldGroup>
    </form>
  );
}
