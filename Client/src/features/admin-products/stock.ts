import type { ManualStockReason, StockReason } from './types';

export const STOCK_REASON: Record<StockReason, string> = {
  initial: 'Initial stock',
  sale: 'Sale',
  order_cancelled: 'Order cancelled',
  restock: 'Restock',
  damage: 'Damage',
  adjustment: 'Adjustment',
};

/** What admins can book by hand, with the label of the quantity input */
export const MANUAL_REASONS: { value: ManualStockReason; quantityLabel: string }[] = [
  { value: 'restock', quantityLabel: 'Units received' },
  { value: 'damage', quantityLabel: 'Units damaged or lost' },
  { value: 'adjustment', quantityLabel: 'Change (e.g. 5 or -5)' },
];

/** +5 / -3 (the ledger stores signed quantities) */
export const formatStockChange = (quantity: number) =>
  quantity > 0 ? `+${quantity}` : `${quantity}`;
