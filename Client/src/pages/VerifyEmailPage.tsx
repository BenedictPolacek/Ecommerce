import { Link, useSearchParams } from 'react-router';
import { FormAlert } from '@/components/form/FormAlert';
import { Button } from '@/components/ui/button';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { ResendVerificationButton } from '@/features/auth/components/ResendVerificationButton';
import { useCurrentUser, useVerifyEmail } from '@/features/auth/hooks';
import { getErrorMessage } from '@/lib/form-errors';

/**
 * Target of the link in the verification email (/verify-email?token=...).
 * The token is only sent on a click: mail scanners that open links automatically
 * would otherwise use up the single-use token before the user sees the page.
 */
export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const verify = useVerifyEmail();
  const { data: user } = useCurrentUser();

  const continueLink = (
    <Button asChild variant={verify.isSuccess ? 'default' : 'outline'}>
      <Link to={user ? '/' : '/login'}>{user ? 'Continue shopping' : 'Log in'}</Link>
    </Button>
  );

  if (!token) {
    return (
      <AuthCard
        title="Invalid link"
        description="This verification link is incomplete. Please use the full link from the email."
      >
        {continueLink}
      </AuthCard>
    );
  }

  if (verify.isSuccess) {
    return (
      <AuthCard title="Email verified" description="Thank you! Your email address is confirmed.">
        {continueLink}
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Confirm your email"
      description="Click the button to confirm your email address."
    >
      <div className="flex flex-col gap-4">
        {verify.isError ? (
          <>
            <FormAlert message={getErrorMessage(verify.error)} />
            {user && !user.email_verified_at ? (
              <ResendVerificationButton email={user.email} />
            ) : (
              continueLink
            )}
          </>
        ) : (
          <Button onClick={() => verify.mutate(token)} disabled={verify.isPending}>
            {verify.isPending ? 'Confirming…' : 'Confirm email'}
          </Button>
        )}
      </div>
    </AuthCard>
  );
}
