import type { AddressFields } from '@/features/addresses/types';

export type OrderStatus =
  'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  unit_price_cents: number;
  quantity: number;
}

export interface OrderStatusChange {
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  created_at: string;
}

/** Order with details (POST /orders, GET /orders/:idOrNumber) */
export interface Order {
  id: string;
  /** Readable number for customers, e.g. ORD-2026-000042 */
  order_number: string;
  user_id: string;
  status: OrderStatus;
  currency: string;
  subtotal_cents: number;
  shipping_fee_cents: number;
  tax_cents: number;
  total_cents: number;
  vat_rate_percent: number;
  /** Snapshots: later changes in the address book do not change the order */
  shipping_address: AddressFields;
  billing_address: AddressFields;
  items: OrderItem[];
  status_history: OrderStatusChange[];
  created_at: string;
  updated_at: string;
}

/** POST /orders: a saved address (id) or an address entered at checkout */
export interface CheckoutInput {
  addressId?: string;
  shippingAddress?: AddressFields;
  billingAddressId?: string;
  billingAddress?: AddressFields;
}
