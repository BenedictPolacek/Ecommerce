import type { AddressFields } from '@/features/addresses/types';
import type { Pagination } from '@/features/products/types';

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

export interface Payment {
  id: string;
  order_id: string;
  /** 'manual' = recorded by an admin, e.g. a bank transfer */
  provider: string;
  provider_payment_id: string | null;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';
  amount_cents: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

/** One row of GET /orders (no items, but their total quantity) */
export interface OrderSummary {
  id: string;
  order_number: string;
  user_id: string;
  status: OrderStatus;
  currency: string;
  subtotal_cents: number;
  shipping_fee_cents: number;
  tax_cents: number;
  total_cents: number;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface OrderList {
  orders: OrderSummary[];
  pagination: Pagination;
}

export interface OrderListParams {
  status?: OrderStatus;
  page: number;
  limit: number;
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
  payments: Payment[];
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
