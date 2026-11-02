import { DeleteAccountDialog } from '@/features/account/components/DeleteAccountDialog';
import { LogoutAllButton } from '@/features/account/components/LogoutAllButton';
import { SessionList } from '@/features/account/components/SessionList';

export function SecurityPage() {
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
        <DeleteAccountDialog />
      </section>
    </>
  );
}
