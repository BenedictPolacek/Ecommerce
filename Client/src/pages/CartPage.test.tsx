import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Cart, CartItem } from '@/features/cart/types';
import { emptyCart, fail, mockApi, ok } from '@/test/mock-api';
import { buildUser, renderRoute } from '@/test/render';

const loggedIn = { 'GET /users/me': ok({ user: buildUser() }) };

const LAMP_ID = 'p0000000-0000-4000-8000-000000000001';
const MUG_ID = 'p0000000-0000-4000-8000-000000000002';

const buildItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  cart_item_id: `ci-${overrides.product_id ?? LAMP_ID}`,
  cart_id: 'cart-1',
  product_id: LAMP_ID,
  product_name: 'Desk Lamp',
  product_slug: 'desk-lamp',
  primary_image: { url: 'https://img.example/lamp.png', alt_text: 'Lamp' },
  sku: 'LAMP-1',
  price_cents: 2500,
  stock_quantity: 10,
  is_active: true,
  quantity: 2,
  line_total_cents: 5000,
  created_at: '2026-10-01T10:00:00.000Z',
  updated_at: '2026-10-01T10:00:00.000Z',
  ...overrides,
});

/** Cart with totals like the server would calculate them (shipping 4.99 below 50 €) */
const buildCart = (items: CartItem[]): Cart => {
  const subtotalCents = items.reduce((sum, item) => sum + item.line_total_cents, 0);
  const shippingFeeCents = items.length === 0 || subtotalCents >= 5000 ? 0 : 499;
  return {
    ...emptyCart,
    items,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalCents,
    shippingFeeCents,
    taxCents: Math.round(((subtotalCents + shippingFeeCents) * 19) / 119),
    totalCents: subtotalCents + shippingFeeCents,
  };
};

const lamp = buildItem();
const mug = buildItem({
  product_id: MUG_ID,
  product_name: 'Coffee Mug',
  product_slug: 'coffee-mug',
  primary_image: null,
  price_cents: 900,
  quantity: 1,
  line_total_cents: 900,
});

const withCart = (cart: Cart, extra: Parameters<typeof mockApi>[0] = {}) =>
  mockApi({ ...loggedIn, 'GET /cart': ok({ cart }), ...extra });

const requestsTo = (fetchMock: ReturnType<typeof mockApi>, method: string, path: string) =>
  fetchMock.mock.calls.filter(([url, init]) => url === `/api${path}` && init?.method === method);

describe('cart in the header', () => {
  it('shows the number of items', async () => {
    withCart(buildCart([lamp, mug]));
    renderRoute('/');

    expect(await screen.findByRole('link', { name: 'Cart, 3 items' })).toHaveAttribute(
      'href',
      '/cart'
    );
  });

  it('sends visitors to the login', async () => {
    mockApi({ 'GET /users/me': fail(401), 'POST /auth/refresh': fail(401) });
    const { router } = renderRoute('/');

    await userEvent.click(await screen.findByRole('link', { name: 'Cart' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(router.state.location.search).toBe('?redirect=%2Fcart');
  });
});

describe('cart page', () => {
  it('lists the items with links, line totals and the summary from the server', async () => {
    withCart(buildCart([lamp, mug]));
    renderRoute('/cart');

    const lampLink = await screen.findByRole('link', { name: 'Desk Lamp' });
    expect(lampLink).toHaveAttribute('href', '/products/desk-lamp');
    const lampRow = lampLink.closest('li')!;
    expect(within(lampRow).getByText('€25.00 each')).toBeInTheDocument();
    expect(within(lampRow).getByText('€50.00')).toBeInTheDocument();

    // <dt>label</dt><dd>value</dd>: read the value next to each label
    const summary = screen.getByRole('region', { name: 'Order summary' });
    const valueOf = (label: string) => within(summary).getByText(label).nextElementSibling;
    expect(valueOf('Subtotal (3 items)')).toHaveTextContent('€59.00');
    expect(valueOf('Shipping')).toHaveTextContent('Free');
    expect(valueOf('Total')).toHaveTextContent('€59.00');
    expect(valueOf('Incl. VAT')).toHaveTextContent('€9.42');
    expect(screen.getByRole('link', { name: 'Proceed to checkout' })).toHaveAttribute(
      'href',
      '/checkout'
    );
  });

  it('shows an empty state', async () => {
    withCart(emptyCart);
    renderRoute('/cart');

    expect(await screen.findByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue shopping' })).toHaveAttribute('href', '/');
  });

  it('changes the quantity and shows the totals the server sends back', async () => {
    const updated = buildCart([buildItem({ quantity: 3, line_total_cents: 7500 })]);
    const fetchMock = withCart(buildCart([lamp]), {
      [`PUT /cart/items/${LAMP_ID}`]: ok({ cart: updated }),
    });
    renderRoute('/cart');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Increase quantity of desk lamp' })
    );

    expect(await screen.findByText('Subtotal (3 items)')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cart, 3 items' })).toBeInTheDocument();
    const [, init] = requestsTo(fetchMock, 'PUT', `/cart/items/${LAMP_ID}`)[0];
    expect(JSON.parse(init?.body as string)).toEqual({ quantity: 3 });
  });

  it('shows the server message when a change fails', async () => {
    withCart(buildCart([lamp]), {
      [`PUT /cart/items/${LAMP_ID}`]: fail(
        400,
        'Requested quantity (3) exceeds available stock (2)'
      ),
    });
    renderRoute('/cart');

    await userEvent.click(
      await screen.findByRole('button', { name: 'Increase quantity of desk lamp' })
    );

    expect(
      await screen.findByText('Requested quantity (3) exceeds available stock (2)')
    ).toBeInTheDocument();
  });

  it('removes an item', async () => {
    withCart(buildCart([lamp, mug]), {
      [`DELETE /cart/items/${MUG_ID}`]: ok({ cart: buildCart([lamp]) }),
    });
    renderRoute('/cart');

    await userEvent.click(await screen.findByRole('button', { name: 'Remove Coffee Mug' }));

    await waitFor(() =>
      expect(screen.queryByRole('link', { name: 'Coffee Mug' })).not.toBeInTheDocument()
    );
    expect(screen.getByText('Subtotal (2 items)')).toBeInTheDocument();
  });

  it('asks before clearing the cart', async () => {
    const fetchMock = withCart(buildCart([lamp]), { 'DELETE /cart': ok({ cart: emptyCart }) });
    renderRoute('/cart');

    await userEvent.click(await screen.findByRole('button', { name: 'Clear cart' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Keep items' }));
    expect(requestsTo(fetchMock, 'DELETE', '/cart')).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: 'Clear cart' }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Clear cart' }));

    expect(await screen.findByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument();
    expect(requestsTo(fetchMock, 'DELETE', '/cart')).toHaveLength(1);
  });

  it('blocks the checkout while items are unavailable or above the stock', async () => {
    withCart(
      buildCart([
        buildItem({ quantity: 4, stock_quantity: 2, line_total_cents: 10000 }),
        { ...mug, is_active: false },
      ])
    );
    renderRoute('/cart');

    expect(await screen.findByText('Only 2 in stock')).toBeInTheDocument();
    expect(screen.getByText('No longer available')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/fix the marked items/i);
    expect(screen.getByRole('button', { name: 'Proceed to checkout' })).toBeDisabled();
  });
});

describe('add to cart from the product page', () => {
  it('updates the cart badge without reloading the cart', async () => {
    const product = {
      id: LAMP_ID,
      name: 'Desk Lamp',
      slug: 'desk-lamp',
      sku: 'LAMP-1',
      description: null,
      price_cents: 2500,
      stock_quantity: 10,
      is_active: true,
      category_id: null,
      category_name: null,
      images: [],
      created_at: '2026-10-01T10:00:00.000Z',
      updated_at: '2026-10-01T10:00:00.000Z',
    };
    const fetchMock = withCart(emptyCart, {
      'GET /products/desk-lamp': ok(product),
      'POST /cart/items': ok({ cart: buildCart([buildItem({ quantity: 1 })]) }),
    });
    renderRoute('/products/desk-lamp');

    await userEvent.click(await screen.findByRole('button', { name: 'Add to cart' }));

    expect(await screen.findByRole('link', { name: 'Cart, 1 item' })).toBeInTheDocument();
    expect(requestsTo(fetchMock, 'GET', '/cart')).toHaveLength(1);
  });
});
