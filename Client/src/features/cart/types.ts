export interface CartItem {
  cart_item_id: string;
  cart_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  price_cents: number;
  stock_quantity: number;
  is_active: boolean;
  quantity: number;
  line_total_cents: number;
  created_at: string;
  updated_at: string;
}

/** GET /cart. Totals are calculated by the server, exactly like at checkout. */
export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  totalItems: number;
  subtotalCents: number;
  shippingFeeCents: number;
  taxCents: number;
  totalCents: number;
  createdAt: string;
}
