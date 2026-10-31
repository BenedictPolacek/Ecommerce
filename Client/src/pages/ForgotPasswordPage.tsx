import { useState } from 'react';
import { Link } from 'react-router';
import { AuthCard } from '@/features/auth/components/AuthCard';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';

const backToLogin = (
  <Link to="/login" className="underline">
    Back to login
  </Link>
);

export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);

  // Same answer whether the account exists or not, so the page cannot be used to find out
  // which emails are registered (user enumeration)
  if (sentTo) {
    return (
      <AuthCard
        title="Check your inbox"
        description={`If an account exists for ${sentTo}, we have sent a link to reset your password. The link is valid for 1 hour.`}
        footer={backToLogin}
      >
        <p className="text-muted-foreground text-sm">
          No email? Check your spam folder or try again in a minute.
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Forgot your password?"
      description="Enter your email and we will send you a link to reset it."
      footer={backToLogin}
    >
      <ForgotPasswordForm onSuccess={setSentTo} />
    </AuthCard>
  );
}
