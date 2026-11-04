import type { Pagination } from '@/features/products/types';

/** Filters of the admin product list (the API shows either active or inactive products) */
export interface AdminProductListParams {
  search?: string;
  categoryId?: string;
  active: boolean;
  page: number;
  limit: number;
}

/** POST /products (stock only here: later changes go through stock movements) */
export interface CreateProductInput {
  name: string;
  slug?: string;
  sku?: string;
  description?: string;
  price_cents: number;
  category_id: string | null;
  stock_quantity: number;
  is_active: boolean;
}

/** PUT /products/:id; null clears an optional field, undefined keeps it */
export interface UpdateProductInput {
  id: string;
  name: string;
  slug?: string;
  sku: string | null;
  description: string | null;
  price_cents: number;
  category_id: string | null;
  is_active: boolean;
}

/** Why the stock changed. Admins choose restock, damage or adjustment; the rest is automatic. */
export type StockReason =
  'initial' | 'sale' | 'order_cancelled' | 'restock' | 'damage' | 'adjustment';

export type ManualStockReason = Extract<StockReason, 'restock' | 'damage' | 'adjustment'>;

/** One row of the stock ledger (GET /products/:id/stock-movements), newest first */
export interface StockMovement {
  id: string;
  product_id: string;
  /** Signed: +50 restock, -2 sale */
  quantity: number;
  /** Stock after this movement, like the balance on a bank statement */
  balance_after: number;
  reason: StockReason;
  order_id: string | null;
  /** Set for sales and cancellations */
  order_number: string | null;
  created_by: string | null;
  note: string | null;
  created_at: string;
}

export interface StockMovementList {
  movements: StockMovement[];
  pagination: Pagination;
}

export interface RecordMovementInput {
  productId: string;
  reason: ManualStockReason;
  quantity: number;
  note?: string;
}

/** Inventory count: the absolute stock, the server books the difference */
export interface SetStockInput {
  productId: string;
  stock_quantity: number;
  note?: string;
}
