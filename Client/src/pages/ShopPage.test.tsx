import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { CategoryNode } from '@/features/categories/types';
import type { ProductSummary } from '@/features/products/types';
import { fail, mockApi, ok } from '@/test/mock-api';
import { renderRoute } from '@/test/render';

const visitor = { 'GET /users/me': fail(401), 'POST /auth/refresh': fail(401) };

const category = (overrides: Partial<CategoryNode>): CategoryNode => ({
  id: 'c0000000-0000-4000-8000-000000000000',
  parent_id: null,
  name: 'Category',
  slug: 'category',
  description: null,
  created_at: '2026-10-01T10:00:00.000Z',
  updated_at: '2026-10-01T10:00:00.000Z',
  children: [],
  ...overrides,
});

const audio = category({
  id: 'c0000000-0000-4000-8000-000000000002',
  name: 'Audio',
  slug: 'audio',
});
const tree = [
  category({
    id: 'c0000000-0000-4000-8000-000000000001',
    name: 'Electronics',
    slug: 'electronics',
    children: [audio],
  }),
  category({ id: 'c0000000-0000-4000-8000-000000000003', name: 'Books', slug: 'books' }),
];

const product = (overrides: Partial<ProductSummary>): ProductSummary => ({
  id: 'p0000000-0000-4000-8000-000000000001',
  name: 'Headphones',
  slug: 'headphones',
  sku: 'HP-1',
  description: null,
  price_cents: 4999,
  stock_quantity: 5,
  is_active: true,
  category_id: audio.id,
  category_name: 'Audio',
  primary_image: { url: 'https://placehold.co/600x600', alt_text: 'Black headphones' },
  created_at: '2026-10-01T10:00:00.000Z',
  updated_at: '2026-10-01T10:00:00.000Z',
  ...overrides,
});

const productList = (products: ProductSummary[], page = 1, totalPages = 1) =>
  ok({ products, pagination: { page, limit: 12, total: products.length, totalPages } });

const productRequests = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.startsWith('/api/products'));

describe('shop page', () => {
  it('shows the products with price, category and stock', async () => {
    mockApi({
      ...visitor,
      'GET /categories': ok({ categories: tree }),
      'GET /products': productList([
        product({}),
        product({
          id: 'p0000000-0000-4000-8000-000000000002',
          name: 'Speaker',
          slug: 'speaker',
          price_cents: 12900,
          stock_quantity: 0,
        }),
      ]),
    });
    renderRoute('/');

    const card = (await screen.findByRole('link', { name: 'Headphones' })).closest('article')!;
    expect(screen.getByRole('link', { name: 'Headphones' })).toHaveAttribute(
      'href',
      '/products/headphones'
    );
    expect(within(card).getByText('€49.99')).toBeInTheDocument();
    expect(within(card).getByRole('img', { name: 'Black headphones' })).toBeInTheDocument();
    expect(within(card).queryByText('Out of stock')).not.toBeInTheDocument();

    const speaker = screen.getByRole('link', { name: 'Speaker' }).closest('article')!;
    expect(within(speaker).getByText('€129.00')).toBeInTheDocument();
    expect(within(speaker).getByText('Out of stock')).toBeInTheDocument();

    expect(screen.getByText('2 products')).toBeInTheDocument();
  });

  it('sends search and page from the URL to the API', async () => {
    const fetchMock = mockApi({ ...visitor, 'GET /products': productList([product({})], 2, 3) });
    renderRoute('/?q=head&page=2');

    expect(await screen.findByText('1 result for "head"')).toBeInTheDocument();
    expect(productRequests(fetchMock)).toEqual(['/api/products?page=2&limit=12&search=head']);
  });

  it('turns the category slug into its id and waits for it before loading products', async () => {
    const fetchMock = mockApi({
      ...visitor,
      'GET /categories': ok({ categories: tree }),
      'GET /products': productList([product({})]),
    });
    renderRoute('/?category=audio');

    expect(await screen.findByRole('heading', { name: 'Audio' })).toBeInTheDocument();
    await screen.findByRole('link', { name: 'Headphones' });
    // Exactly one request, already filtered (no unfiltered request first)
    expect(productRequests(fetchMock)).toEqual([
      `/api/products?page=1&limit=12&category_id=${audio.id}`,
    ]);
    // Subcategories are listed and the active one is marked
    expect(screen.getByRole('link', { name: 'Audio' })).toHaveAttribute('aria-current', 'page');
  });

  it('shows "category not found" for an unknown slug', async () => {
    const fetchMock = mockApi({ ...visitor, 'GET /categories': ok({ categories: tree }) });
    renderRoute('/?category=does-not-exist');

    expect(await screen.findByRole('heading', { name: 'Category not found' })).toBeInTheDocument();
    expect(productRequests(fetchMock)).toHaveLength(0);
  });

  it('searches on submit and starts again at page 1', async () => {
    mockApi({ ...visitor, 'GET /products': productList([product({})], 3, 5) });
    const { router } = renderRoute('/?category=&page=3');

    await userEvent.type(await screen.findByRole('searchbox'), 'speaker{Enter}');

    await waitFor(() => expect(router.state.location.search).toBe('?q=speaker'));
  });

  it('keeps the filters in the pagination links', async () => {
    mockApi({ ...visitor, 'GET /products': productList([product({})], 2, 3) });
    renderRoute('/?q=head&page=2');

    const pagination = await screen.findByRole('navigation', { name: 'Pagination' });
    expect(within(pagination).getByRole('link', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(within(pagination).getByRole('link', { name: 'Previous page' })).toHaveAttribute(
      'href',
      '/?q=head'
    );
    expect(within(pagination).getByRole('link', { name: 'Next page' })).toHaveAttribute(
      'href',
      '/?q=head&page=3'
    );
  });

  it('offers to clear the filters when nothing was found', async () => {
    mockApi({ ...visitor, 'GET /products': productList([]) });
    renderRoute('/?q=nothing');

    expect(await screen.findByRole('heading', { name: 'No products found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Clear filters' })).toHaveAttribute('href', '/');
  });

  it('shows an error with a retry button', async () => {
    mockApi({ ...visitor, 'GET /products': fail(400, 'Bad request') });
    renderRoute('/');

    expect(
      await screen.findByRole('heading', { name: 'Products could not be loaded' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
