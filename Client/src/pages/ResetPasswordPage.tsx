import { Link, useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';

const requestNewLink = (
  <Link to="/forgot-password" className="underline">
    Request a new link
  </Link>
);

/** Target of the link in the password reset email (/reset-password?token=...) */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  if (!token) {
    return (
      <AuthCard
        title="Invalid link"
        description="This reset link is incomplete. Please use the full link from the email."
      >
        {requestNewLink}
      </AuthCard>
    );
  }

  const handleSuccess = () => {
    toast.success('Password changed', {
      description: 'For your security you were logged out everywhere. Please log in again.',
    });
    navigate('/login', { replace: true });
  };

  return (
    <AuthCard title="Set a new password" footer={requestNewLink}>
      <ResetPasswordForm token={token} onSuccess={handleSuccess} />
    </AuthCard>
  );
}
