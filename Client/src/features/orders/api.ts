import { api } from '@/lib/api-client';
import type { CheckoutInput, Order } from './types';

/** Turns the cart into an order. Totals, stock and prices are checked again on the server. */
export const placeOrder = (input: CheckoutInput) =>
  api.post<{ order: Order }>('/orders', input).then(({ order }) => order);

/** By id or by order number (ORD-2026-000042) */
export const getOrder = (idOrNumber: string) =>
  api.get<{ order: Order }>(`/orders/${encodeURIComponent(idOrNumber)}`).then(({ order }) => order);
