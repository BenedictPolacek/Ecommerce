import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getProduct, getProducts } from './api';
import type { ProductListParams } from './types';

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params: ProductListParams) => [...productKeys.lists(), params] as const,
  detail: (slug: string) => [...productKeys.all, 'detail', slug] as const,
};

export function useProducts(params: ProductListParams, { enabled = true } = {}) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => getProducts(params),
    enabled,
    // Keep showing the current page while the next one loads (no flash of an empty grid)
    placeholderData: keepPreviousData,
  });
}

export function useProduct(slug: string) {
  return useQuery({
    queryKey: productKeys.detail(slug),
    queryFn: () => getProduct(slug),
  });
}
