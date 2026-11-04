import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { FormAlert } from '@/components/form/FormAlert';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { centsToAmount, formatPrice, parseAmountToCents } from '@/lib/format';
import { setServerErrors } from '@/lib/form-errors';
import { useRecordPayment } from '../hooks';

// Mirrors Server/src/modules/payments/payment.validation.js (UX only, the server decides)
const paymentSchema = (outstandingCents: number) =>
  z.object({
    amount: z
      .string()
      .transform((value, ctx) => {
        const cents = parseAmountToCents(value);
        if (cents === null || cents === 0) {
          ctx.addIssue({ code: 'custom', message: 'Enter an amount like 19.99' });
          return z.NEVER;
        }
        return cents;
      })
      .refine((cents) => cents <= outstandingCents, {
        message: `At most the outstanding ${formatPrice(outstandingCents)}`,
      }),
    reference: z.string().trim().max(255, 'Reference cannot exceed 255 characters'),
  });

type FormIn = z.input<ReturnType<typeof paymentSchema>>;
type FormOut = z.output<ReturnType<typeof paymentSchema>>;

interface RecordPaymentFormProps {
  orderId: string;
  outstandingCents: number;
}

/** A bank transfer arrived: book it. Several partial payments are possible. */
export function RecordPaymentForm({ orderId, outstandingCents }: RecordPaymentFormProps) {
  const recordPayment = useRecordPayment();
  const form = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(paymentSchema(outstandingCents)),
    // Usually the whole outstanding amount arrives at once
    defaultValues: { amount: centsToAmount(outstandingCents), reference: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ amount, reference }) => {
    try {
      await recordPayment.mutateAsync({
        orderId,
        amountCents: amount,
        reference: reference || undefined,
      });
      toast.success(
        amount === outstandingCents
          ? 'Payment recorded. The order is paid.'
          : `Payment of ${formatPrice(amount)} recorded`
      );
    } catch (error) {
      setServerErrors(error, form.setError, ['amount', 'reference']);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert message={errors.root?.server?.message} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="payment-amount"
            label="Amount (EUR)"
            inputMode="decimal"
            autoComplete="off"
            error={errors.amount}
            {...form.register('amount')}
          />
          <TextField
            id="payment-reference"
            label="Bank reference (optional)"
            autoComplete="off"
            error={errors.reference}
            {...form.register('reference')}
          />
        </div>
        <Button type="submit" className="self-start" disabled={isSubmitting}>
          {isSubmitting ? 'Recording…' : 'Record payment'}
        </Button>
      </FieldGroup>
    </form>
  );
}
