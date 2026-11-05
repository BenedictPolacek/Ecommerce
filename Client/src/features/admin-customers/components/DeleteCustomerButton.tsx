import { useNavigate } from 'react-router';
import { toast } from 'sonner';
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
import { useDeleteCustomer } from '../hooks';
import type { Customer } from '../types';

/** GDPR deletion request that reached support (email, phone) */
export function DeleteCustomerButton({ customer }: { customer: Customer }) {
  const remove = useDeleteCustomer();
  const navigate = useNavigate();
  const name = `${customer.first_name} ${customer.last_name}`;
  const hasOrders = customer.stats.order_count > 0;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="self-start" disabled={remove.isPending}>
          {remove.isPending ? 'Deleting…' : 'Delete customer'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {hasOrders
              ? 'Name, email, password, addresses and the cart are removed. The orders stay with an anonymized customer, because invoices must be kept.'
              : 'The account and all its data are deleted.'}{' '}
            The customer gets a confirmation email. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep customer</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              remove.mutate(customer.id, {
                onSuccess: () => {
                  toast.success(`${name} deleted`);
                  navigate('/admin/customers', { replace: true });
                },
                // 409: open orders must be completed first
                onError: (error) => toast.error(getErrorMessage(error)),
              })
            }
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
