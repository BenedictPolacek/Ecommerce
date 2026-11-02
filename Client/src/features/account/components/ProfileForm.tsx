import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FormAlert } from '@/components/form/FormAlert';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/button';
import { FieldGroup } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { User } from '@/features/auth/types';
import { setServerErrors } from '@/lib/form-errors';
import { useUpdateProfile } from '../hooks';
import { profileSchema, type ProfileInput } from '../schemas';

export function ProfileForm({ user }: { user: User }) {
  const updateProfile = useUpdateProfile();
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { first_name: user.first_name, last_name: user.last_name },
  });
  const { errors, isSubmitting, isDirty } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const updated = await updateProfile.mutateAsync(values);
      // The saved values are the new baseline: "Save" is disabled again until the next change
      form.reset({ first_name: updated.first_name, last_name: updated.last_name });
      toast.success('Profile saved');
    } catch (error) {
      setServerErrors(error, form.setError, ['first_name', 'last_name']);
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
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          {/* Changing the email would need a new verification flow in the API */}
          <Input id="email" value={user.email} readOnly disabled />
        </div>
        <Button type="submit" className="self-start" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Saving…' : 'Save changes'}
        </Button>
      </FieldGroup>
    </form>
  );
}
