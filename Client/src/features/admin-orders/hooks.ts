import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productKeys } from '@/features/products/hooks';
import { getAdminOrder, getAdminOrders, recordPayment, updateOrderStatus } from './api';
import type { AdminOrderListParams } from './types';

// Own keys under 'admin': never mixed up with the admin's own orders in ['orders', ...]
export const adminOrderKeys = {
  all: ['admin', 'orders'] as const,
  lists: () => [...adminOrderKeys.all, 'list'] as const,
  list: (params: AdminOrderListParams) => [...adminOrderKeys.lists(), params] as const,
  detail: (orderNumber: string) => [...adminOrderKeys.all, 'detail', orderNumber] as const,
};

export function useAdminOrders(params: AdminOrderListParams) {
  return useQuery({
    queryKey: adminOrderKeys.list(params),
    queryFn: () => getAdminOrders(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminOrder(orderNumber: string) {
  return useQuery({
    queryKey: adminOrderKeys.detail(orderNumber),
    queryFn: () => getAdminOrder(orderNumber),
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateOrderStatus,
    onSuccess: (order, { status }) => {
      queryClient.setQueryData(adminOrderKeys.detail(order.order_number), order);
      void queryClient.invalidateQueries({ queryKey: adminOrderKeys.lists() });
      // Cancelling puts the items back into stock
      if (status === 'cancelled') void queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: recordPayment,
    // Payments, outstanding amount and maybe the status changed: reload the order and lists
    onSuccess: () => queryClient.invalidateQueries({ queryKey: adminOrderKeys.all }),
  });
}
