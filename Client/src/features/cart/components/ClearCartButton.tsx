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
import { useClearCart } from '../hooks';

/** Asks before emptying the cart: one wrong click should not lose everything */
export function ClearCartButton() {
  const clear = useClearCart();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={clear.isPending}>
          Clear cart
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clear your cart?</AlertDialogTitle>
          <AlertDialogDescription>All items will be removed from your cart.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep items</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              clear.mutate(undefined, { onError: (error) => toast.error(getErrorMessage(error)) })
            }
          >
            Clear cart
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
