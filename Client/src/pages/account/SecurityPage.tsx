import { Link } from 'react-router';
import { DeleteAccountDialog } from '@/features/account/components/DeleteAccountDialog';
import { LogoutAllButton } from '@/features/account/components/LogoutAllButton';
import { SessionList } from '@/features/account/components/SessionList';
import { useCurrentUser } from '@/features/auth/hooks';

export function SecurityPage() {
  // RequireAuth only renders this page with a logged-in user
  const { data: user } = useCurrentUser();

  return (
    <>
      <title>Security | Ecommerce Shop</title>
      <section aria-labelledby="devices-title" className="flex flex-col gap-4">
        <div>
          <h2 id="devices-title" className="text-lg font-semibold">
            Logged-in devices
          </h2>
          <p className="text-muted-foreground text-sm">
            Don&apos;t recognize a device? Log it out and change your password.
          </p>
        </div>
        <SessionList />
        <LogoutAllButton />
      </section>

      <section
        aria-labelledby="delete-title"
        className="border-destructive/40 flex flex-col gap-4 rounded-lg border p-4"
      >
        <div>
          <h2 id="delete-title" className="text-destructive text-lg font-semibold">
            Delete account
          </h2>
          <p className="text-muted-foreground text-sm">
            Accounts with orders that are not completed yet cannot be deleted.
          </p>
        </div>
        {user?.has_password === false ? (
          // Deleting asks for the password: a stolen session alone cannot delete the account
          <p className="text-sm">
            To confirm a deletion we ask for your password. You sign in with Google or GitHub, so{' '}
            <Link to="/account" className="underline underline-offset-4">
              set a password first
            </Link>
            .
          </p>
        ) : (
          <DeleteAccountDialog />
        )}
      </section>
    </>
  );
}
