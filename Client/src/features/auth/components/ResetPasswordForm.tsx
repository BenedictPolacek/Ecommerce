import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FormAlert } from '@/components/form/FormAlert';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { setServerErrors } from '@/lib/form-errors';
import { useResetPassword } from '../hooks';
import { PASSWORD_MIN_LENGTH, resetPasswordSchema, type ResetPasswordInput } from '../schemas';

interface ResetPasswordFormProps {
  token: string;
  onSuccess: () => void;
}

export function ResetPasswordForm({ token, onSuccess }: ResetPasswordFormProps) {
  const resetPassword = useResetPassword();
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ password }) => {
    try {
      await resetPassword.mutateAsync({ token, password });
      onSuccess();
    } catch (error) {
      setServerErrors(error, form.setError, ['password']);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert message={errors.root?.server?.message} />
        <TextField
          id="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
          error={errors.password}
          {...form.register('password')}
        />
        <TextField
          id="confirmPassword"
          label="Repeat new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword}
          {...form.register('confirmPassword')}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : 'Set new password'}
        </Button>
      </FieldGroup>
    </form>
  );
}
