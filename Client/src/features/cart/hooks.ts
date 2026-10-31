import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/features/auth/hooks';
import { addToCart, clearCart, getCart, removeCartItem, updateCartItem } from './api';
import type { Cart } from './types';

export const cartKeys = {
  cart: ['cart'] as const,
};

/** The cart of the logged-in user; not loaded for visitors (the API requires a login) */
export function useCart() {
  const { data: user } = useCurrentUser();

  return useQuery({
    queryKey: cartKeys.cart,
    queryFn: getCart,
    enabled: !!user,
  });
}

/**
 * All cart changes return the whole new cart: store it instead of fetching it again.
 * The UI waits for the server (no optimistic update), so it always shows real stock and totals.
 */
function useCartMutation<TInput>(mutationFn: (input: TInput) => Promise<Cart>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (cart) => queryClient.setQueryData(cartKeys.cart, cart),
  });
}

export const useAddToCart = () => useCartMutation(addToCart);

export const useUpdateCartItem = () => useCartMutation(updateCartItem);

export const useRemoveCartItem = () => useCartMutation(removeCartItem);

export const useClearCart = () => useCartMutation(clearCart);
