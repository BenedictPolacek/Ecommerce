import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useForgotPassword } from '@/features/auth/hooks';
import { getErrorMessage } from '@/lib/form-errors';

/**
 * For accounts that only sign in with Google/GitHub: the password is set through the
 * existing reset email, so there is no second way to set a password without the mailbox
 */
export function SetPasswordButton({ email }: { email: string }) {
  const forgotPassword = useForgotPassword();

  return (
    <Button
      variant="outline"
      className="self-start"
      disabled={forgotPassword.isPending}
      onClick={() =>
        forgotPassword.mutate(email, {
          onSuccess: () =>
            toast.success('Check your inbox', {
              description: `We sent a link to set your password to ${email}.`,
            }),
          onError: (error) => toast.error(getErrorMessage(error)),
        })
      }
    >
      {forgotPassword.isPending ? 'Sending…' : 'Email me a link to set a password'}
    </Button>
  );
}
