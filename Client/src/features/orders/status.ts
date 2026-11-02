import type { Order, OrderStatus } from './types';

/** Customer-facing wording for each order status (the API sends the technical value) */
export const ORDER_STATUS: Record<
  OrderStatus,
  { label: string; description: string; tone: 'neutral' | 'info' | 'success' | 'danger' }
> = {
  pending: {
    label: 'Awaiting payment',
    description: 'We ship your order as soon as your bank transfer has arrived.',
    tone: 'neutral',
  },
  paid: {
    label: 'Paid',
    description: 'Payment received. We are preparing your order.',
    tone: 'info',
  },
  processing: { label: 'Processing', description: 'Your order is being packed.', tone: 'info' },
  shipped: { label: 'Shipped', description: 'Your order is on its way.', tone: 'info' },
  delivered: { label: 'Delivered', description: 'Your order has been delivered.', tone: 'success' },
  cancelled: { label: 'Cancelled', description: 'This order has been cancelled.', tone: 'danger' },
  refunded: { label: 'Refunded', description: 'The amount has been refunded.', tone: 'danger' },
};

export const ORDER_STATUSES = Object.keys(ORDER_STATUS) as OrderStatus[];

export const isOrderStatus = (value: string | null): value is OrderStatus =>
  value !== null && value in ORDER_STATUS;

/** Sum of successful payments; orders can be paid in several transfers */
export const paidCents = (order: Pick<Order, 'payments'>) =>
  order.payments
    .filter((payment) => payment.status === 'succeeded')
    .reduce((sum, payment) => sum + payment.amount_cents, 0);
