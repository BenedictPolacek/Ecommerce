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
