import type { CartItem } from './types';

/** Why an item cannot be ordered as it is, or null if it is fine */
export function getItemProblem(item: CartItem): string | null {
  if (!item.is_active || item.stock_quantity <= 0) return 'No longer available';
  if (item.quantity > item.stock_quantity) return `Only ${item.stock_quantity} in stock`;
  return null;
}
