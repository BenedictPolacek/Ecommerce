import { api } from '@/lib/api-client';
import type { CheckoutInput, Order, OrderList, OrderListParams } from './types';

/** Turns the cart into an order. Totals, stock and prices are checked again on the server. */
export const placeOrder = (input: CheckoutInput) =>
  api.post<{ order: Order }>('/orders', input).then(({ order }) => order);

/** By id or by order number (ORD-2026-000042) */
export const getOrder = (idOrNumber: string) =>
  api.get<{ order: Order }>(`/orders/${encodeURIComponent(idOrNumber)}`).then(({ order }) => order);

/** The logged-in user's orders, newest first */
export function getMyOrders({ status, page, limit }: OrderListParams) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) query.set('status', status);
  return api.get<OrderList>(`/orders?${query}`);
}
