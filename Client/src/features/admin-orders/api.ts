import { api } from '@/lib/api-client';
import type {
  AdminOrder,
  AdminOrderList,
  AdminOrderListParams,
  RecordPaymentInput,
  UpdateStatusInput,
} from './types';

/** All orders of the shop, newest first */
export function getAdminOrders({ status, search, page, limit }: AdminOrderListParams) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) query.set('status', status);
  if (search) query.set('search', search);
  return api.get<AdminOrderList>(`/orders/all?${query}`);
}

/** Same endpoint as for customers; admins get the customer, notes and who changed what */
export const getAdminOrder = (orderNumber: string) =>
  api
    .get<{ order: AdminOrder }>(`/orders/${encodeURIComponent(orderNumber)}`)
    .then(({ order }) => order);

/** Returns the whole updated order. The server checks the allowed transitions. */
export const updateOrderStatus = ({ orderId, status, note }: UpdateStatusInput) =>
  api
    .patch<{ order: AdminOrder }>(`/orders/${orderId}/status`, { status, note })
    .then(({ order }) => order);

/** A bank transfer arrived. The order becomes "paid" once nothing is outstanding. */
export const recordPayment = ({ orderId, amountCents, reference }: RecordPaymentInput) =>
  api.post<void>(`/orders/${orderId}/payments`, {
    provider: 'bank_transfer',
    providerPaymentId: reference,
    amountCents,
  });
