import { Link, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { OAuthButtons } from '@/features/auth/components/OAuthButtons';
import { RegisterForm } from '@/features/auth/components/RegisterForm';

export function RegisterPage() {
  const [searchParams] = useSearchParams();

  return (
    <AuthCard
      title="Create an account"
      description="Sign up to place orders and track them."
      footer={
        <>
          Already have an account?{' '}
          <Link to={{ pathname: '/login', search: searchParams.toString() }} className="underline">
            Log in
          </Link>
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <OAuthButtons />
        <RegisterForm
          onSuccess={(user) =>
            toast.success('Account created!', {
              description: `We sent a confirmation link to ${user.email}.`,
            })
          }
        />
      </div>
    </AuthCard>
  );
}
