import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminOrderKeys } from '@/features/admin-orders/hooks';
import { deleteCustomer, getCustomer, getCustomers } from './api';
import type { CustomerListParams } from './types';

export const adminCustomerKeys = {
  all: ['admin', 'customers'] as const,
  lists: () => [...adminCustomerKeys.all, 'list'] as const,
  list: (params: CustomerListParams) => [...adminCustomerKeys.lists(), params] as const,
  detail: (id: string) => [...adminCustomerKeys.all, 'detail', id] as const,
};

export function useCustomers(params: CustomerListParams) {
  return useQuery({
    queryKey: adminCustomerKeys.list(params),
    queryFn: () => getCustomers(params),
    placeholderData: keepPreviousData,
  });
}

export function useCustomer(id: string) {
  return useQuery({ queryKey: adminCustomerKeys.detail(id), queryFn: () => getCustomer(id) });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () =>
      Promise.all([
        // Not the detail: the page is left right after, a refetch would only show a 404
        queryClient.invalidateQueries({ queryKey: adminCustomerKeys.lists() }),
        // Their orders now show the anonymized customer
        queryClient.invalidateQueries({ queryKey: adminOrderKeys.all }),
      ]),
  });
}
