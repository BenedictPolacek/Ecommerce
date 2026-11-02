import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FormAlert } from '@/components/form/FormAlert';
import { TextField } from '@/components/form/TextField';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FieldGroup } from '@/components/ui/field';
import { useLeaveSession } from '@/features/auth/hooks';
import { ApiError } from '@/lib/api-client';
import { setServerErrors } from '@/lib/form-errors';
import { useDeleteAccount } from '../hooks';
import { deleteAccountSchema, type DeleteAccountInput } from '../schemas';

function DeleteAccountForm({ onCancel }: { onCancel: () => void }) {
  const deleteAccount = useDeleteAccount();
  const leaveSession = useLeaveSession();
  const form = useForm<DeleteAccountInput>({
    resolver: zodResolver(deleteAccountSchema),
    defaultValues: { password: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async ({ password }) => {
    try {
      await deleteAccount.mutateAsync(password);
    } catch (error) {
      // Same rule as when changing the password: a 400 without field errors = wrong password.
      // Other errors (e.g. 409 while orders are still open) are shown above the form.
      if (error instanceof ApiError && error.status === 400 && !error.errors?.length) {
        form.setError('password', { type: 'server', message: error.message });
        return;
      }
      setServerErrors(error, form.setError, ['password']);
      return;
    }
    await leaveSession();
    toast.success('Your account has been deleted.');
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <FormAlert message={errors.root?.server?.message} />
        <TextField
          id="delete-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password}
          {...form.register('password')}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Keep my account
          </Button>
          <Button type="submit" variant="destructive" disabled={isSubmitting}>
            {isSubmitting ? 'Deleting…' : 'Delete account'}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

/** Deleting cannot be undone, so the password is asked again (like GitHub or Google) */
export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="self-start">
          Delete account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            This cannot be undone. Your profile, addresses and cart are removed and you are logged
            out on all devices. Records of past orders are kept, as the law requires.
          </DialogDescription>
        </DialogHeader>
        {/* Rendered only while open: the password is not kept after closing */}
        {open && <DeleteAccountForm onCancel={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}
