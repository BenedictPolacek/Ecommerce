import { api } from '@/lib/api-client';
import type { Cart } from './types';

// Every cart endpoint answers with the whole updated cart
type CartResponse = { cart: Cart };
const unwrap = ({ cart }: CartResponse) => cart;

export const getCart = () => api.get<CartResponse>('/cart').then(unwrap);

/** Adds to the quantity already in the cart */
export const addToCart = (input: { productId: string; quantity: number }) =>
  api.post<CartResponse>('/cart/items', input).then(unwrap);

/** Sets the quantity of a product that is already in the cart */
export const updateCartItem = ({ productId, quantity }: { productId: string; quantity: number }) =>
  api.put<CartResponse>(`/cart/items/${productId}`, { quantity }).then(unwrap);

export const removeCartItem = (productId: string) =>
  api.delete<CartResponse>(`/cart/items/${productId}`).then(unwrap);

export const clearCart = () => api.delete<CartResponse>('/cart').then(unwrap);
