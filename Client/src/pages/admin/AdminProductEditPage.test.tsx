import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { audio, buildProduct } from '@/test/fixtures';
import { fail, mockApi, ok, sequence } from '@/test/mock-api';
import { buildUser, renderRoute } from '@/test/render';

const product = buildProduct();
const PRODUCT_PATH = `/products/${product.id}`;

const asAdmin = (extra: Parameters<typeof mockApi>[0] = {}) =>
  mockApi({
    'GET /users/me': ok({ user: buildUser({ role: 'admin' }) }),
    'GET /categories': ok({ categories: [audio] }),
    // The edit page also shows the stock history
    [`GET ${PRODUCT_PATH}/stock-movements`]: ok({
      movements: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    }),
    ...extra,
  });

const bodyOf = (fetchMock: ReturnType<typeof mockApi>, method: string, path: string) => {
  const call = fetchMock.mock.calls.find(
    ([url, init]) => url === `/api${path}` && init?.method === method
  );
  return call ? JSON.parse(call[1]?.body as string) : undefined;
};

describe('new product', () => {
  it('creates a hidden product and continues on its edit page', async () => {
    const created = buildProduct({ name: 'Desk Lamp', slug: 'desk-lamp', is_active: false });
    const fetchMock = asAdmin({
      'POST /products': ok(created),
      [`GET ${PRODUCT_PATH}`]: ok(created),
    });
    const { router } = renderRoute('/admin/products/new');

    await userEvent.type(await screen.findByLabelText('Name'), 'Desk Lamp');
    await userEvent.type(screen.getByLabelText('Price incl. VAT (EUR)'), '24,90');
    await userEvent.selectOptions(screen.getByLabelText('Category'), audio.id);
    await userEvent.clear(screen.getByLabelText('Initial stock'));
    await userEvent.type(screen.getByLabelText('Initial stock'), '15');
    // New products start hidden
    expect(screen.getByRole('checkbox', { name: 'Visible in the shop' })).not.toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: 'Create product' }));

    expect(await screen.findByText('Desk Lamp created')).toBeInTheDocument();
    expect(bodyOf(fetchMock, 'POST', '/products')).toEqual({
      name: 'Desk Lamp',
      price_cents: 2490,
      category_id: audio.id,
      is_active: false,
      stock_quantity: 15,
    });
    // The edit page is lazy loaded: the URL only changes once its code is there. Wait for the
    // page first, checking the URL right after the toast was flaky on slower CI runners.
    expect(await screen.findByRole('heading', { name: 'Desk Lamp' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(`/admin${PRODUCT_PATH}`);
  });

  it('checks price, slug and stock before sending', async () => {
    const fetchMock = asAdmin();
    renderRoute('/admin/products/new');

    await userEvent.type(await screen.findByLabelText('Name'), 'Lamp');
    await userEvent.type(screen.getByLabelText('Price incl. VAT (EUR)'), '24.999');
    await userEvent.type(screen.getByLabelText('URL slug (optional)'), 'Desk Lamp');
    await userEvent.clear(screen.getByLabelText('Initial stock'));
    await userEvent.type(screen.getByLabelText('Initial stock'), '-1');
    await userEvent.click(screen.getByRole('button', { name: 'Create product' }));

    expect(await screen.findByText('Enter a price like 19.99')).toBeInTheDocument();
    expect(
      screen.getByText(/only lowercase letters, digits and single hyphens/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Enter a whole number, 0 or more')).toBeInTheDocument();
    expect(bodyOf(fetchMock, 'POST', '/products')).toBeUndefined();
  });

  it('shows a taken SKU above the form', async () => {
    asAdmin({ 'POST /products': fail(409, 'SKU already exists') });
    renderRoute('/admin/products/new');

    await userEvent.type(await screen.findByLabelText('Name'), 'Lamp');
    await userEvent.type(screen.getByLabelText('Price incl. VAT (EUR)'), '10');
    await userEvent.type(screen.getByLabelText('SKU (optional)'), 'HP-1');
    await userEvent.click(screen.getByRole('button', { name: 'Create product' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('SKU already exists');
  });
});

describe('edit product', () => {
  it('shows the current values; stock is not part of the form', async () => {
    asAdmin({ [`GET ${PRODUCT_PATH}`]: ok(product) });
    renderRoute(`/admin${PRODUCT_PATH}`);

    expect(await screen.findByLabelText('Name')).toHaveValue('Headphones');
    expect(screen.getByLabelText('Price incl. VAT (EUR)')).toHaveValue('49.99');
    expect(screen.getByLabelText('Category')).toHaveValue(audio.id);
    expect(screen.getByLabelText('URL slug (optional)')).toHaveValue('headphones');
    expect(screen.queryByLabelText('Initial stock')).not.toBeInTheDocument();
    expect(screen.getByText(/Stock: 20/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /view in shop/i })).toHaveAttribute(
      'href',
      '/products/headphones'
    );
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('saves changes, clears emptied fields and can hide the product', async () => {
    const saved = { ...product, price_cents: 3999, description: null, is_active: false };
    const fetchMock = asAdmin({
      [`GET ${PRODUCT_PATH}`]: sequence(ok(product), ok(saved)),
      [`PUT ${PRODUCT_PATH}`]: ok(saved),
    });
    renderRoute(`/admin${PRODUCT_PATH}`);

    const price = await screen.findByLabelText('Price incl. VAT (EUR)');
    await userEvent.clear(price);
    await userEvent.type(price, '39.99');
    await userEvent.clear(screen.getByLabelText('Description (optional)'));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Visible in the shop' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Product saved')).toBeInTheDocument();
    expect(bodyOf(fetchMock, 'PUT', PRODUCT_PATH)).toEqual({
      name: 'Headphones',
      slug: 'headphones',
      sku: 'HP-1',
      description: null,
      price_cents: 3999,
      category_id: audio.id,
      is_active: false,
    });
    expect(await screen.findByText('Hidden')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /view in shop/i })).not.toBeInTheDocument();
  });

  it('shows a not found page for unknown products', async () => {
    asAdmin({ [`GET ${PRODUCT_PATH}`]: fail(404, 'Product not found') });
    renderRoute(`/admin${PRODUCT_PATH}`);

    expect(await screen.findByRole('heading', { name: 'Product not found' })).toBeInTheDocument();
  });
});
