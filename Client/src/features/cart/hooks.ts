import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addToCart } from './api';

export const cartKeys = {
  cart: ['cart'] as const,
};

export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: addToCart,
    // The response already is the new cart: store it instead of fetching it again
    onSuccess: (cart) => queryClient.setQueryData(cartKeys.cart, cart),
  });
}
