import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productKeys } from '@/features/products/hooks';
import {
  addProductImage,
  createProduct,
  deleteProductImage,
  getAdminProduct,
  getAdminProducts,
  getStockMovements,
  recordStockMovement,
  reorderProductImages,
  setStock,
  updateProduct,
} from './api';
import type { AdminProductListParams } from './types';

export const adminProductKeys = {
  all: ['admin', 'products'] as const,
  lists: () => [...adminProductKeys.all, 'list'] as const,
  list: (params: AdminProductListParams) => [...adminProductKeys.lists(), params] as const,
  detail: (id: string) => [...adminProductKeys.all, 'detail', id] as const,
  // Under "all": every product change also reloads the stock history
  movements: (id: string, page: number) =>
    [...adminProductKeys.all, 'movements', id, page] as const,
};

export function useAdminProducts(params: AdminProductListParams) {
  return useQuery({
    queryKey: adminProductKeys.list(params),
    queryFn: () => getAdminProducts(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminProduct(id: string) {
  return useQuery({ queryKey: adminProductKeys.detail(id), queryFn: () => getAdminProduct(id) });
}

const STOCK_HISTORY_PAGE_SIZE = 10;

export function useStockMovements(productId: string, page: number) {
  return useQuery({
    queryKey: adminProductKeys.movements(productId, page),
    queryFn: () => getStockMovements(productId, page, STOCK_HISTORY_PAGE_SIZE),
    placeholderData: keepPreviousData,
  });
}

/** After a change the admin lists and the shop (lists, product pages) are outdated */
function useProductMutation<TInput, TData>(mutationFn: (input: TInput) => Promise<TData>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminProductKeys.all }),
        queryClient.invalidateQueries({ queryKey: productKeys.all }),
      ]),
  });
}

export const useCreateProduct = () => useProductMutation(createProduct);

export const useUpdateProduct = () => useProductMutation(updateProduct);

export const useRecordStockMovement = () => useProductMutation(recordStockMovement);

export const useSetStock = () => useProductMutation(setStock);

export const useAddProductImage = () => useProductMutation(addProductImage);

export const useReorderProductImages = () => useProductMutation(reorderProductImages);

export const useDeleteProductImage = () => useProductMutation(deleteProductImage);
