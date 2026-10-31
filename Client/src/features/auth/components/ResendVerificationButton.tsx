import type { ComponentProps } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/form-errors';
import { useResendVerification } from '../hooks';

type ResendVerificationButtonProps = Omit<ComponentProps<typeof Button>, 'onClick'> & {
  email: string;
};

/** Sends a new verification email (the server allows one per minute) */
export function ResendVerificationButton({ email, ...buttonProps }: ResendVerificationButtonProps) {
  const resend = useResendVerification();

  const handleClick = () =>
    resend.mutate(undefined, {
      onSuccess: () =>
        toast.success('Verification email sent', { description: `Check your inbox at ${email}.` }),
      onError: (error) => toast.error(getErrorMessage(error)),
    });

  return (
    <Button {...buttonProps} onClick={handleClick} disabled={resend.isPending}>
      {resend.isPending ? 'Sending…' : 'Resend email'}
    </Button>
  );
}
