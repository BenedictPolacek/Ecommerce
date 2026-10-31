import { api } from '@/lib/api-client';
import type { ProductList, ProductListParams } from './types';

export function getProducts({ search, categoryId, page, limit }: ProductListParams) {
  // URLSearchParams encodes user input (spaces, &, ...) safely
  const query = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) query.set('search', search);
  if (categoryId) query.set('category_id', categoryId);

  return api.get<ProductList>(`/products?${query}`);
}
