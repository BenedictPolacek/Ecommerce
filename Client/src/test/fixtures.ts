import type { Address, AddressFields } from '@/features/addresses/types';
import type { AdminOrder, AdminOrderSummary, OrderCustomer } from '@/features/admin-orders/types';
import type { CategoryNode } from '@/features/categories/types';
import type { Order, OrderSummary, Payment } from '@/features/orders/types';
import type { Product } from '@/features/products/types';

// Shared test data. Builders take overrides, so each test only states what matters to it.

export const homeAddress: Address = {
  id: 'a0000000-0000-4000-8000-000000000001',
  user_id: 'user-1',
  address_line1: 'Hauptstrasse 1',
  address_line2: null,
  city: 'Berlin',
  state: null,
  postal_code: '10115',
  country: 'DE',
  is_default: true,
  created_at: '2026-10-01T10:00:00.000Z',
  updated_at: '2026-10-01T10:00:00.000Z',
};

/** The address part only, as stored in an order */
export const addressFields = ({
  address_line1,
  address_line2,
  city,
  state,
  postal_code,
  country,
}: AddressFields): AddressFields => ({
  address_line1,
  address_line2,
  city,
  state,
  postal_code,
  country,
});

export const buildOrder = (overrides: Partial<Order> = {}): Order => ({
  id: 'o0000000-0000-4000-8000-000000000001',
  order_number: 'ORD-2026-000042',
  user_id: 'user-1',
  status: 'pending',
  currency: 'EUR',
  subtotal_cents: 5000,
  shipping_fee_cents: 0,
  tax_cents: 798,
  total_cents: 5000,
  vat_rate_percent: 19,
  shipping_address: addressFields(homeAddress),
  billing_address: addressFields(homeAddress),
  items: [
    {
      id: 'oi-1',
      order_id: 'o0000000-0000-4000-8000-000000000001',
      product_id: 'p0000000-0000-4000-8000-000000000001',
      product_name: 'Desk Lamp',
      unit_price_cents: 2500,
      quantity: 2,
    },
  ],
  payments: [],
  status_history: [
    { from_status: null, to_status: 'pending', created_at: '2026-10-01T10:00:00.000Z' },
  ],
  created_at: '2026-10-01T10:00:00.000Z',
  updated_at: '2026-10-01T10:00:00.000Z',
  ...overrides,
});

export const buildOrderSummary = (overrides: Partial<OrderSummary> = {}): OrderSummary => ({
  id: 'o0000000-0000-4000-8000-000000000001',
  order_number: 'ORD-2026-000042',
  user_id: 'user-1',
  status: 'pending',
  currency: 'EUR',
  subtotal_cents: 5000,
  shipping_fee_cents: 0,
  tax_cents: 798,
  total_cents: 5000,
  item_count: 2,
  created_at: '2026-10-01T10:00:00.000Z',
  updated_at: '2026-10-01T10:00:00.000Z',
  ...overrides,
});

export const buildPayment = (overrides: Partial<Payment> = {}): Payment => ({
  id: 'pay-1',
  order_id: 'o0000000-0000-4000-8000-000000000001',
  provider: 'manual',
  provider_payment_id: null,
  status: 'succeeded',
  amount_cents: 5000,
  currency: 'EUR',
  created_at: '2026-10-03T09:00:00.000Z',
  updated_at: '2026-10-03T09:00:00.000Z',
  ...overrides,
});

export const customerAnna: OrderCustomer = {
  id: 'user-1',
  email: 'anna@example.com',
  first_name: 'Anna',
  last_name: 'Schmidt',
};

/** Order as an admin sees it: with customer, notes and who changed the status */
export const buildAdminOrder = (overrides: Partial<AdminOrder> = {}): AdminOrder => {
  const { status_history, ...order } = buildOrder();
  return {
    ...order,
    customer: customerAnna,
    status_history: status_history.map((entry, i) => ({
      ...entry,
      id: `h-${i}`,
      changed_by: 'user-1',
      note: null,
    })),
    ...overrides,
  };
};

export const buildAdminOrderSummary = (
  overrides: Partial<AdminOrderSummary> = {}
): AdminOrderSummary => ({ ...buildOrderSummary(), customer: customerAnna, ...overrides });

export const audio: CategoryNode = {
  id: 'c0000000-0000-4000-8000-000000000002',
  parent_id: null,
  name: 'Audio',
  slug: 'audio',
  description: null,
  created_at: '2026-10-01T10:00:00.000Z',
  updated_at: '2026-10-01T10:00:00.000Z',
  children: [],
};

export const buildProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'p0000000-0000-4000-8000-000000000001',
  name: 'Headphones',
  slug: 'headphones',
  sku: 'HP-1',
  description: 'Wireless, 30 hours battery',
  price_cents: 4999,
  stock_quantity: 20,
  is_active: true,
  category_id: audio.id,
  category_name: 'Audio',
  images: [
    { id: 'i1', url: 'https://img.example/front.png', alt_text: 'Front view', sort_order: 0 },
    { id: 'i2', url: 'https://img.example/side.png', alt_text: 'Side view', sort_order: 1 },
  ],
  created_at: '2026-10-01T10:00:00.000Z',
  updated_at: '2026-10-01T10:00:00.000Z',
  ...overrides,
});
