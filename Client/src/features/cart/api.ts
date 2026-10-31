import { api } from '@/lib/api-client';
import type { Cart } from './types';

/** Adds to the quantity already in the cart; returns the whole updated cart */
export async function addToCart(input: { productId: string; quantity: number }): Promise<Cart> {
  const { cart } = await api.post<{ cart: Cart }>('/cart/items', input);
  return cart;
}
