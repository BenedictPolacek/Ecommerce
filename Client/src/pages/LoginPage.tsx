import { Link, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { FormAlert } from '@/components/form/FormAlert';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { LoginForm } from '@/features/auth/components/LoginForm';
import { OAuthButtons } from '@/features/auth/components/OAuthButtons';
import { oauthErrorMessage } from '@/features/auth/oauth-errors';

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const oauthError = oauthErrorMessage(searchParams.get('oauth_error'));

  return (
    <AuthCard
      title="Log in"
      description="Welcome back! Log in to your account."
      footer={
        <>
          No account yet?{' '}
          <Link
            to={{ pathname: '/register', search: searchParams.toString() }}
            className="underline"
          >
            Create one
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Set by the API when a sign-in with Google/GitHub did not work */}
        <FormAlert message={oauthError} />
        <OAuthButtons />
        {/* GuestOnly redirects as soon as the user is known */}
        <LoginForm onSuccess={(user) => toast.success(`Welcome back, ${user.first_name}!`)} />
      </div>
      <p className="mt-4 text-center text-sm">
        <Link
          to="/forgot-password"
          className="text-muted-foreground hover:text-foreground underline"
        >
          Forgot your password?
        </Link>
      </p>
    </AuthCard>
  );
}
