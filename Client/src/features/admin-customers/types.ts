import type { User, UserRole } from '@/features/auth/types';
import type { Pagination } from '@/features/products/types';

/** One row of GET /users */
export interface CustomerSummary extends User {
  order_count: number;
}

export interface CustomerList {
  users: CustomerSummary[];
  pagination: Pagination;
}

export interface CustomerListParams {
  /** Part of the email or the full name */
  search?: string;
  /** Without a role: every account */
  role?: UserRole;
  page: number;
  limit: number;
}

/** GET /users/:id */
export interface Customer extends User {
  stats: {
    order_count: number;
    /** Paid orders only (not pending, cancelled or refunded) */
    spent_cents: number;
    last_order_at: string | null;
  };
}
