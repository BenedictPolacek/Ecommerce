import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Address } from '../types';
import { AddressForm } from './AddressForm';

interface AddressDialogProps {
  /** The button that opens the dialog */
  trigger: ReactNode;
  address?: Address;
  defaultChecked?: boolean;
}

/** Add or edit an address in a modal. Focus stays inside and Escape closes it (Radix). */
export function AddressDialog({ trigger, address, defaultChecked }: AddressDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{address ? 'Edit address' : 'Add address'}</DialogTitle>
          <DialogDescription>We deliver to the countries in the list.</DialogDescription>
        </DialogHeader>
        {/* Rendered only while open: the form starts fresh every time */}
        {open && (
          <AddressForm
            address={address}
            defaultChecked={defaultChecked}
            onCancel={() => setOpen(false)}
            onSaved={() => {
              setOpen(false);
              toast.success(address ? 'Address updated' : 'Address added');
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
