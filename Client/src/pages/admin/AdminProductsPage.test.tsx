import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { CategoryNode } from '@/features/categories/types';
import type { ProductSummary } from '@/features/products/types';
import { audio, buildProduct } from '@/test/fixtures';
import { mockApi, ok } from '@/test/mock-api';
import { buildUser, renderRoute } from '@/test/render';

const NBSP = String.fromCharCode(0xa0);

const headphones: CategoryNode = {
  ...audio,
  id: 'c0000000-0000-4000-8000-000000000003',
  parent_id: audio.id,
  name: 'Headphones',
  slug: 'headphones',
};

const summary = (overrides: Partial<ProductSummary> = {}): ProductSummary => {
  const { images, ...product } = buildProduct();
  return { ...product, primary_image: images[0], ...overrides };
};

const productList = (products: ProductSummary[]) =>
  ok({ products, pagination: { page: 1, limit: 20, total: products.length, totalPages: 1 } });

const asAdmin = (extra: Parameters<typeof mockApi>[0] = {}) =>
  mockApi({
    'GET /users/me': ok({ user: buildUser({ role: 'admin' }) }),
    'GET /categories': ok({ categories: [{ ...audio, children: [headphones] }] }),
    'GET /products': productList([]),
    ...extra,
  });

/** Query of the last admin product list request */
const lastListQuery = (fetchMock: ReturnType<typeof mockApi>) => {
  const url = fetchMock.mock.calls
    .map(([u]) => String(u))
    .filter((u) => u.startsWith('/api/products?'))
    .at(-1)!;
  return new URLSearchParams(url.split('?')[1]);
};

describe('admin product list', () => {
  it('lists products with stock and visibility, linking to the edit page', async () => {
    asAdmin({
      'GET /products': productList([
        summary(),
        summary({ id: 'p2', name: 'Cable', sku: null, stock_quantity: 0, primary_image: null }),
      ]),
    });
    renderRoute('/admin/products');

    const link = await screen.findByRole('link', { name: 'Headphones' });
    expect(link).toHaveAttribute('href', '/admin/products/p0000000-0000-4000-8000-000000000001');
    const [, first, second] = screen.getAllByRole('row');
    expect(first).toHaveTextContent('HP-1');
    expect(first).toHaveTextContent('€49.99');
    expect(first).toHaveTextContent('Visible');
    // No SKU, sold out
    expect(second).toHaveTextContent('Cable–Audio');
    expect(screen.getByRole('link', { name: 'New product' })).toHaveAttribute(
      'href',
      '/admin/products/new'
    );
  });

  it('only asks for active products by default and filters via the URL', async () => {
    const fetchMock = asAdmin();
    const { router } = renderRoute('/admin/products');

    await screen.findByRole('heading', { name: 'No products found' });
    expect(lastListQuery(fetchMock).get('is_active')).toBe('true');

    // Subcategories are indented below their parent
    const category = screen.getByRole('combobox', { name: 'Category' });
    // (accessible names collapse whitespace, so the text content is checked)
    expect(screen.getByRole('option', { name: 'Audio' }).textContent).toBe('Audio');
    expect(screen.getByRole('option', { name: 'Headphones' }).textContent).toBe(
      NBSP.repeat(4) + 'Headphones'
    );
    await userEvent.selectOptions(category, headphones.id);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Visibility' }), 'inactive');

    expect(await screen.findByRole('heading', { name: 'No hidden products' })).toBeInTheDocument();
    expect(router.state.location.search).toBe(`?category=${headphones.id}&status=inactive`);
    const query = lastListQuery(fetchMock);
    expect(query.get('is_active')).toBe('false');
    expect(query.get('category_id')).toBe(headphones.id);
  });
});
