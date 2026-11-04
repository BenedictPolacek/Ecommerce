import type {
  Order,
  OrderListParams,
  OrderStatus,
  OrderStatusChange,
  OrderSummary,
} from '@/features/orders/types';
import type { Pagination } from '@/features/products/types';

/** Who placed the order; deleted customers are anonymized ("Deleted User") */
export interface OrderCustomer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

/** One row of GET /orders/all */
export interface AdminOrderSummary extends OrderSummary {
  customer: OrderCustomer;
}

export interface AdminOrderList {
  orders: AdminOrderSummary[];
  pagination: Pagination;
}

export interface AdminOrderListParams extends OrderListParams {
  /** Part of the order number or the customer email */
  search?: string;
}

/** Admins also see who changed the status and the internal note */
export interface AdminStatusChange extends OrderStatusChange {
  id: string;
  changed_by: string | null;
  note: string | null;
}

/** GET /orders/:idOrNumber as admin */
export interface AdminOrder extends Omit<Order, 'status_history'> {
  status_history: AdminStatusChange[];
  customer: OrderCustomer;
}

export interface UpdateStatusInput {
  orderId: string;
  status: Exclude<OrderStatus, 'pending' | 'paid'>;
  note?: string;
}

export interface RecordPaymentInput {
  orderId: string;
  amountCents: number;
  /** E.g. the reference on the bank statement */
  reference?: string;
}
