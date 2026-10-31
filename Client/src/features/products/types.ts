export interface ProductImageSummary {
  url: string;
  alt_text: string | null;
}

/** Product as returned in lists (GET /products) */
export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  price_cents: number;
  stock_quantity: number;
  is_active: boolean;
  category_id: string | null;
  category_name: string | null;
  primary_image: ProductImageSummary | null;
  created_at: string;
  updated_at: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductList {
  products: ProductSummary[];
  pagination: Pagination;
}

export interface ProductListParams {
  search?: string;
  categoryId?: string;
  page: number;
  limit: number;
}
