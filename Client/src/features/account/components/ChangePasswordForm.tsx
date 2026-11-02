import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FormAlert } from '@/components/form/FormAlert';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { ApiError } from '@/lib/api-client';
import { setServerErrors } from '@/lib/form-errors';
import { useChangePassword } from '../hooks';
import { changePasswordSchema, type ChangePasswordInput } from '../schemas';

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function ChangePasswordForm() {
  const changePassword = useChangePassword();
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      // Never keep passwords in the form longer than needed
      form.reset(EMPTY);
      toast.success('Password changed', {
        description: 'For your security, your other devices have been logged out.',
      });
    } catch (error) {
      // A 400 without field errors is the wrong current password (validation errors always
      // come with `errors`). Matching the status, not the text, survives rewording on the server.
      if (error instanceof ApiError && error.status === 400 && !error.errors?.length) {
        form.setError('currentPassword', { type: 'server', message: error.message });
        return;
      }
      setServerErrors(error, form.setError, ['currentPassword', 'newPassword']);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert message={errors.root?.server?.message} />
        <TextField
          id="currentPassword"
          label="Current password"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword}
          {...form.register('currentPassword')}
        />
        <TextField
          id="newPassword"
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.newPassword}
          {...form.register('newPassword')}
        />
        <TextField
          id="confirmPassword"
          label="Repeat new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword}
          {...form.register('confirmPassword')}
        />
        <Button type="submit" className="self-start" disabled={isSubmitting}>
          {isSubmitting ? 'Changing…' : 'Change password'}
        </Button>
      </FieldGroup>
    </form>
  );
}
