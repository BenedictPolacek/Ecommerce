import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productKeys } from '@/features/products/hooks';
import { createProduct, getAdminProduct, getAdminProducts, updateProduct } from './api';
import type { AdminProductListParams } from './types';

export const adminProductKeys = {
  all: ['admin', 'products'] as const,
  lists: () => [...adminProductKeys.all, 'list'] as const,
  list: (params: AdminProductListParams) => [...adminProductKeys.lists(), params] as const,
  detail: (id: string) => [...adminProductKeys.all, 'detail', id] as const,
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
