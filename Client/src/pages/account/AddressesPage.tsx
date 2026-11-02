import { Plus } from 'lucide-react';
import { PageLoading, PageStatus } from '@/components/layout/PageStatus';
import { Button } from '@/components/ui/button';
import { AddressCard } from '@/features/addresses/components/AddressCard';
import { AddressDialog } from '@/features/addresses/components/AddressDialog';
import { useAddresses } from '@/features/addresses/hooks';

export function AddressesPage() {
  const { data: addresses, isPending, isError, refetch } = useAddresses();

  if (isPending) return <PageLoading />;

  if (isError) {
    return (
      <PageStatus title="Your addresses could not be loaded">
        <Button onClick={() => refetch()}>Try again</Button>
      </PageStatus>
    );
  }

  return (
    <section aria-labelledby="addresses-title" className="flex flex-col gap-4">
      <title>Addresses | Ecommerce Shop</title>
      <div className="flex items-center justify-between gap-4">
        <h2 id="addresses-title" className="text-lg font-semibold">
          Addresses
        </h2>
        <AddressDialog
          // The first address becomes the default, it is preselected at checkout
          defaultChecked={addresses.length === 0}
          trigger={
            <Button size="sm">
              <Plus />
              Add address
            </Button>
          }
        />
      </div>

      {addresses.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          You have no saved addresses yet. Saved addresses can be chosen at checkout.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard key={address.id} address={address} />
          ))}
        </ul>
      )}
    </section>
  );
}
