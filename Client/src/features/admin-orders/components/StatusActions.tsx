import { useState } from 'react';
import { toast } from 'sonner';
import { FormAlert } from '@/components/form/FormAlert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ORDER_STATUS } from '@/features/orders/status';
import { getErrorMessage } from '@/lib/form-errors';
import { useUpdateOrderStatus } from '../hooks';
import { STATUS_ACTIONS, type StatusAction } from '../status';
import type { AdminOrder } from '../types';

const NOTE_MAX_LENGTH = 500;

function StatusActionDialog({ order, action }: { order: AdminOrder; action: StatusAction }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const update = useUpdateOrderStatus();

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    // Start fresh next time
    setNote('');
    update.reset();
  };

  const confirm = () =>
    update.mutate(
      { orderId: order.id, status: action.to, note: note.trim() || undefined },
      {
        onSuccess: () => {
          setOpen(false);
          toast.success(`Order ${order.order_number}: ${ORDER_STATUS[action.to].label}`);
        },
      }
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant={action.destructive ? 'outline' : 'default'}>{action.label}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{action.label}?</DialogTitle>
          <DialogDescription>{action.description}</DialogDescription>
        </DialogHeader>
        <FormAlert message={update.isError ? getErrorMessage(update.error) : undefined} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="status-note">Internal note (optional)</Label>
          <Textarea
            id="status-note"
            value={note}
            maxLength={NOTE_MAX_LENGTH}
            onChange={(event) => setNote(event.target.value)}
            placeholder="E.g. tracking number or reason. Customers do not see it."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Back
          </Button>
          <Button
            variant={action.destructive ? 'destructive' : 'default'}
            disabled={update.isPending}
            onClick={confirm}
          >
            {update.isPending ? 'Saving…' : action.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Buttons for the steps allowed from the current status, each with a confirmation */
export function StatusActions({ order }: { order: AdminOrder }) {
  const actions = STATUS_ACTIONS[order.status];

  if (actions.length === 0) {
    return <p className="text-muted-foreground text-sm">This order is closed.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <StatusActionDialog key={action.to} order={order} action={action} />
      ))}
    </div>
  );
}
