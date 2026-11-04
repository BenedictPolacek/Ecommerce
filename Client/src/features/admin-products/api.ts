import type { Product, ProductImage, ProductList } from '@/features/products/types';
import { api } from '@/lib/api-client';
import type {
  AdminProductListParams,
  CreateProductInput,
  RecordMovementInput,
  SetStockInput,
  StockMovement,
  StockMovementList,
  UpdateProductInput,
} from './types';

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

export const getStockMovements = (productId: string, page: number, limit: number) =>
  api.get<StockMovementList>(`/products/${productId}/stock-movements?page=${page}&limit=${limit}`);

export const recordStockMovement = ({ productId, ...input }: RecordMovementInput) =>
  api.post<{ movement: StockMovement }>(`/products/${productId}/stock-movements`, input);

export const setStock = ({ productId, ...input }: SetStockInput) =>
  api.patch<Product>(`/products/${productId}/stock`, input);

// ─── Images (the first one is the main image in the shop) ────────────────────

export const addProductImage = ({
  productId,
  ...input
}: {
  productId: string;
  url: string;
  alt_text?: string;
}) => api.post<{ image: ProductImage }>(`/products/${productId}/images`, input);

/** The complete new order, every image exactly once */
export const reorderProductImages = ({
  productId,
  imageIds,
}: {
  productId: string;
  imageIds: string[];
}) =>
  api.put<{ images: ProductImage[] }>(`/products/${productId}/images/order`, {
    image_ids: imageIds,
  });

export const deleteProductImage = ({
  productId,
  imageId,
}: {
  productId: string;
  imageId: string;
}) => api.delete<void>(`/products/${productId}/images/${imageId}`);
