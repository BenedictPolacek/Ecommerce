import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addressKeys } from '@/features/addresses/hooks';
import { cartKeys } from '@/features/cart/hooks';
import { productKeys } from '@/features/products/hooks';
import { getOrder, placeOrder } from './api';

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  detail: (orderNumber: string) => [...orderKeys.all, 'detail', orderNumber] as const,
};

export function useOrder(orderNumber: string) {
  return useQuery({
    queryKey: orderKeys.detail(orderNumber),
    queryFn: () => getOrder(orderNumber),
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: placeOrder,
    onSuccess: (order) => {
      // The confirmation page can show the order without loading it again
      queryClient.setQueryData(orderKeys.detail(order.order_number), order);
      // The server emptied the cart and reduced the stock
      void queryClient.invalidateQueries({ queryKey: cartKeys.cart });
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
      void queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: addressKeys.all });
    },
  });
}
