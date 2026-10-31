import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { CategoryNode } from '@/features/categories/types';
import type { Product } from '@/features/products/types';
import { fail, mockApi, ok } from '@/test/mock-api';
import { buildUser, renderRoute } from '@/test/render';

const visitor = { 'GET /users/me': fail(401), 'POST /auth/refresh': fail(401) };
const loggedIn = { 'GET /users/me': ok({ user: buildUser() }) };

const audio: CategoryNode = {
  id: 'c0000000-0000-4000-8000-000000000002',
  parent_id: null,
  name: 'Audio',
  slug: 'audio',
  description: null,
  created_at: '2026-10-01T10:00:00.000Z',
  updated_at: '2026-10-01T10:00:00.000Z',
  children: [],
};

const buildProduct = (overrides: Partial<Product> = {}): Product => ({
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

const withProduct = (product: Product, extra: Parameters<typeof mockApi>[0] = visitor) => ({
  'GET /categories': ok({ categories: [audio] }),
  [`GET /products/${product.slug}`]: ok(product),
  ...extra,
});

const cartRequests = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls.filter(([url]) => url === '/api/cart/items');

describe('product page', () => {
  it('shows the product with price, stock, description and breadcrumb', async () => {
    mockApi(withProduct(buildProduct()));
    renderRoute('/products/headphones');

    expect(await screen.findByRole('heading', { name: 'Headphones' })).toBeInTheDocument();
    expect(screen.getByText('€49.99')).toBeInTheDocument();
    expect(screen.getByText('In stock')).toBeInTheDocument();
    expect(screen.getByText('Wireless, 30 hours battery')).toBeInTheDocument();
    expect(document.title).toBe('Headphones | Ecommerce Shop');

    const breadcrumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(await within(breadcrumb).findByRole('link', { name: 'Audio' })).toHaveAttribute(
      'href',
      '/?category=audio'
    );
  });

  it('shows a not found page for unknown or inactive products', async () => {
    mockApi({ ...visitor, 'GET /products/gone': fail(404, 'Product not found') });
    renderRoute('/products/gone');

    expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeInTheDocument();
  });

  it('switches images in the gallery', async () => {
    mockApi(withProduct(buildProduct()));
    renderRoute('/products/headphones');

    expect(await screen.findByRole('img', { name: 'Front view' })).toBeInTheDocument();

    const second = screen.getByRole('button', { name: 'Show image 2 of 2' });
    await userEvent.click(second);

    expect(screen.getByRole('img', { name: 'Side view' })).toBeInTheDocument();
    expect(second).toHaveAttribute('aria-pressed', 'true');
  });

  it('warns about low stock', async () => {
    mockApi(withProduct(buildProduct({ stock_quantity: 3 })));
    renderRoute('/products/headphones');
    expect(await screen.findByText('Only 3 left in stock')).toBeInTheDocument();
  });

  it('cannot add a sold out product', async () => {
    mockApi(withProduct(buildProduct({ stock_quantity: 0 })));
    renderRoute('/products/headphones');

    expect(await screen.findByRole('button', { name: 'Out of stock' })).toBeDisabled();
  });
});

describe('add to cart', () => {
  it('sends visitors to the login and back to the product', async () => {
    const fetchMock = mockApi(withProduct(buildProduct()));
    const { router } = renderRoute('/products/headphones');

    await userEvent.click(await screen.findByRole('button', { name: 'Add to cart' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(router.state.location.search).toBe('?redirect=%2Fproducts%2Fheadphones');
    expect(cartRequests(fetchMock)).toHaveLength(0);
  });

  it('adds the chosen quantity for logged-in users', async () => {
    const fetchMock = mockApi(
      withProduct(buildProduct(), { ...loggedIn, 'POST /cart/items': ok({ cart: {} }) })
    );
    renderRoute('/products/headphones');

    await userEvent.click(await screen.findByRole('button', { name: 'Increase quantity' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add to cart' }));

    expect(await screen.findByText('Added 2 × Headphones to your cart')).toBeInTheDocument();
    expect(JSON.parse(cartRequests(fetchMock)[0][1]?.body as string)).toEqual({
      productId: 'p0000000-0000-4000-8000-000000000001',
      quantity: 2,
    });
    // Back to 1 for the next add
    expect(screen.getByRole('spinbutton', { name: 'Quantity' })).toHaveValue(1);
  });

  it('shows the stock message from the server', async () => {
    mockApi(
      withProduct(buildProduct(), {
        ...loggedIn,
        'POST /cart/items': fail(
          400,
          'Cannot add 1 more. Current stock is 20 (you have 20 in cart)'
        ),
      })
    );
    renderRoute('/products/headphones');

    await userEvent.click(await screen.findByRole('button', { name: 'Add to cart' }));

    expect(
      await screen.findByText('Cannot add 1 more. Current stock is 20 (you have 20 in cart)')
    ).toBeInTheDocument();
  });

  it('limits a typed quantity to the stock', async () => {
    mockApi(withProduct(buildProduct({ stock_quantity: 5 }), loggedIn));
    renderRoute('/products/headphones');

    const input = await screen.findByRole('spinbutton', { name: 'Quantity' });
    await userEvent.clear(input);
    await userEvent.type(input, '99');
    fireEvent.blur(input);

    expect(input).toHaveValue(5);
    expect(screen.getByRole('button', { name: 'Increase quantity' })).toBeDisabled();
  });
});
