import { Link, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { LoginForm } from '@/features/auth/components/LoginForm';

export function LoginPage() {
  const [searchParams] = useSearchParams();

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
      {/* GuestOnly redirects as soon as the user is known */}
      <LoginForm onSuccess={(user) => toast.success(`Welcome back, ${user.first_name}!`)} />
    </AuthCard>
  );
}
