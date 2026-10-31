import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FormAlert } from '@/components/form/FormAlert';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { ApiError } from '@/lib/api-client';
import { setServerErrors } from '@/lib/form-errors';
import { useRegister } from '../hooks';
import { PASSWORD_MIN_LENGTH, registerSchema, type RegisterInput } from '../schemas';
import type { User } from '../types';

const FIELDS = ['first_name', 'last_name', 'email', 'password'] as const;

export function RegisterForm({ onSuccess }: { onSuccess?: (user: User) => void }) {
  const registerUser = useRegister();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { first_name: '', last_name: '', email: '', password: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const { user } = await registerUser.mutateAsync(values);
      onSuccess?.(user);
    } catch (error) {
      // 409 = email already registered: show it at the email field
      if (error instanceof ApiError && error.status === 409) {
        form.setError('email', { type: 'server', message: error.message });
        return;
      }
      setServerErrors(error, form.setError, FIELDS);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert message={errors.root?.server?.message} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            id="first_name"
            label="First name"
            autoComplete="given-name"
            error={errors.first_name}
            {...form.register('first_name')}
          />
          <TextField
            id="last_name"
            label="Last name"
            autoComplete="family-name"
            error={errors.last_name}
            {...form.register('last_name')}
          />
        </div>
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email}
          {...form.register('email')}
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
          error={errors.password}
          {...form.register('password')}
        />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </FieldGroup>
    </form>
  );
}
