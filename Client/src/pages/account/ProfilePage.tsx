import { ChangePasswordForm } from '@/features/account/components/ChangePasswordForm';
import { ProfileForm } from '@/features/account/components/ProfileForm';
import { useCurrentUser } from '@/features/auth/hooks';

export function ProfilePage() {
  // RequireAuth only renders this page with a logged-in user
  const { data: user } = useCurrentUser();
  if (!user) return null;

  return (
    <>
      <title>My account | Ecommerce Shop</title>
      <section aria-labelledby="profile-title" className="flex flex-col gap-4">
        <h2 id="profile-title" className="text-lg font-semibold">
          Profile
        </h2>
        <ProfileForm user={user} />
      </section>

      <section aria-labelledby="password-title" className="flex flex-col gap-4 border-t pt-8">
        <h2 id="password-title" className="text-lg font-semibold">
          Change password
        </h2>
        <ChangePasswordForm />
      </section>
    </>
  );
}
