import type { OrderStatus } from '@/features/orders/types';
import type { UpdateStatusInput } from './types';

export interface StatusAction {
  to: UpdateStatusInput['status'];
  label: string;
  /** Shown in the confirmation dialog */
  description: string;
  destructive?: boolean;
}

const cancel: StatusAction = {
  to: 'cancelled',
  label: 'Cancel order',
  description:
    'The items go back into stock. If the customer has already paid, pay the money back as well. A cancelled order cannot be changed again.',
  destructive: true,
};

const refund: StatusAction = {
  to: 'refunded',
  label: 'Mark as refunded',
  description:
    'Records that the money was paid back (refund it with the bank first). The stock is not changed. A refunded order cannot be changed again.',
  destructive: true,
};

/**
 * Next steps per status. Mirrors ORDER_TRANSITIONS in Server/src/modules/orders/order-status.js
 * (UX only, the server decides). "paid" is missing on purpose: it is only set by recording
 * a payment.
 */
export const STATUS_ACTIONS: Record<OrderStatus, StatusAction[]> = {
  pending: [cancel],
  paid: [
    {
      to: 'processing',
      label: 'Start processing',
      description: 'The order is being packed. The customer sees "Processing".',
    },
    cancel,
    refund,
  ],
  processing: [
    {
      to: 'shipped',
      label: 'Mark as shipped',
      description: 'The parcel has been handed to the carrier. The customer sees "Shipped".',
    },
    cancel,
    refund,
  ],
  shipped: [
    {
      to: 'delivered',
      label: 'Mark as delivered',
      description: 'The customer has received the parcel.',
    },
    refund,
  ],
  delivered: [refund],
  cancelled: [],
  refunded: [],
};
