import type { ComponentProps } from 'react';
import type { FieldError as FormFieldError } from 'react-hook-form';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface TextFieldProps extends ComponentProps<typeof Input> {
  id: string;
  label: string;
  error?: FormFieldError;
}

/** Label + input + error message, wired up for screen readers. Use with form.register(). */
export function TextField({ id, label, error, ...inputProps }: TextFieldProps) {
  const errorId = `${id}-error`;

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      <FieldError id={errorId} errors={[error]} />
    </Field>
  );
}
