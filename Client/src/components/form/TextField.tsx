import type { ComponentProps } from 'react';
import type { FieldError as FormFieldError } from 'react-hook-form';
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface TextFieldProps extends ComponentProps<typeof Input> {
  id: string;
  label: string;
  /** Hint below the input, read by screen readers together with the input */
  hint?: string;
  error?: FormFieldError;
}

/** Label + input + hint + error message, wired up for screen readers. Use with form.register(). */
export function TextField({ id, label, hint, error, ...inputProps }: TextFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ');

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        aria-invalid={!!error}
        aria-describedby={describedBy || undefined}
        {...inputProps}
      />
      {hint && <FieldDescription id={hintId}>{hint}</FieldDescription>}
      <FieldError id={errorId} errors={[error]} />
    </Field>
  );
}
