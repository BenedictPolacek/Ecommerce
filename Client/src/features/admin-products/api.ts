import type { Product, ProductList } from '@/features/products/types';
import { api } from '@/lib/api-client';
import type { AdminProductListParams, CreateProductInput, UpdateProductInput } from './types';

export function getAdminProducts({
  search,
  categoryId,
  active,
  page,
  limit,
}: AdminProductListParams) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    // Only admins may set it; customers always get active products
    is_active: String(active),
  });
  if (search) query.set('search', search);
  if (categoryId) query.set('category_id', categoryId);
  return api.get<ProductList>(`/products?${query}`);
}

/** By id: admins also get inactive products */
export const getAdminProduct = (id: string) => api.get<Product>(`/products/${id}`);

export const createProduct = (input: CreateProductInput) => api.post<Product>('/products', input);

export const updateProduct = ({ id, ...input }: UpdateProductInput) =>
  api.put<Product>(`/products/${id}`, input);
