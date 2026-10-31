import { useCurrentUser } from '../hooks';
import { ResendVerificationButton } from './ResendVerificationButton';

/** Reminder for logged-in users who have not confirmed their email (needed for checkout) */
export function VerifyEmailBanner() {
  const { data: user } = useCurrentUser();

  if (!user || user.email_verified_at) return null;

  return (
    <div role="status" className="border-b border-amber-200 bg-amber-50 text-amber-900">
      <div className="container mx-auto flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        <p>
          Please confirm your email address to place orders. We sent a link to{' '}
          <strong>{user.email}</strong>.
        </p>
        <ResendVerificationButton email={user.email} variant="outline" size="sm" />
      </div>
    </div>
  );
}
