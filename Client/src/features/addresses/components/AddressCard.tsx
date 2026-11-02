import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { getErrorMessage } from '@/lib/form-errors';
import { useDeleteAddress, useUpdateAddress } from '../hooks';
import type { Address } from '../types';
import { AddressBlock } from './AddressBlock';
import { AddressDialog } from './AddressDialog';

export function AddressCard({ address }: { address: Address }) {
  const update = useUpdateAddress();
  const remove = useDeleteAddress();
  const busy = update.isPending || remove.isPending;
  const onError = (error: Error) => toast.error(getErrorMessage(error));
  // Short name for buttons, so screen readers know which address they act on
  const name = address.address_line1;

  return (
    <li className="flex flex-col gap-4 rounded-lg border p-4" aria-busy={busy}>
      <div className="flex items-start justify-between gap-4">
        <AddressBlock address={address} />
        {address.is_default && <Badge variant="secondary">Default</Badge>}
      </div>

      <div className="flex flex-wrap gap-2">
        <AddressDialog
          address={address}
          trigger={
            <Button variant="outline" size="sm" disabled={busy} aria-label={`Edit ${name}`}>
              Edit
            </Button>
          }
        />
        {!address.is_default && (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            aria-label={`Set ${name} as default`}
            onClick={() =>
              update.mutate(
                { id: address.id, is_default: true },
                { onSuccess: () => toast.success('Default address changed'), onError }
              )
            }
          >
            Set as default
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" disabled={busy} aria-label={`Delete ${name}`}>
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this address?</AlertDialogTitle>
              <AlertDialogDescription>
                Your past orders keep their address. This only removes it from your address book.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep address</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  remove.mutate(address.id, {
                    onSuccess: () => toast.success('Address deleted'),
                    onError,
                  })
                }
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}
