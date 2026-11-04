import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { StockMovement } from '@/features/admin-products/types';
import type { ProductImage } from '@/features/products/types';
import { audio, buildProduct } from '@/test/fixtures';
import { fail, mockApi, ok } from '@/test/mock-api';
import { buildUser, renderRoute } from '@/test/render';

const product = buildProduct();
const PRODUCT_PATH = `/products/${product.id}`;
const [front, side] = product.images;

const movement = (overrides: Partial<StockMovement>): StockMovement => ({
  id: 'm1',
  product_id: product.id,
  quantity: 10,
  balance_after: 10,
  reason: 'restock',
  order_id: null,
  order_number: null,
  created_by: 'admin-1',
  note: null,
  created_at: '2026-10-02T10:00:00.000Z',
  ...overrides,
});

const history = (movements: StockMovement[]) =>
  ok({ movements, pagination: { page: 1, limit: 10, total: movements.length, totalPages: 1 } });

const openProduct = (extra: Parameters<typeof mockApi>[0] = {}) => {
  const fetchMock = mockApi({
    'GET /users/me': ok({ user: buildUser({ role: 'admin' }) }),
    'GET /categories': ok({ categories: [audio] }),
    [`GET ${PRODUCT_PATH}`]: ok(product),
    [`GET ${PRODUCT_PATH}/stock-movements`]: history([]),
    ...extra,
  });
  renderRoute(`/admin${PRODUCT_PATH}`);
  return fetchMock;
};

const bodyOf = (fetchMock: ReturnType<typeof mockApi>, method: string, path: string) => {
  const call = fetchMock.mock.calls.find(
    ([url, init]) => url === `/api${path}` && init?.method === method
  );
  return call ? JSON.parse(call[1]?.body as string) : undefined;
};

describe('stock', () => {
  it('shows the history like a bank statement, sales link to their order', async () => {
    openProduct({
      [`GET ${PRODUCT_PATH}/stock-movements`]: history([
        movement({
          id: 'm2',
          reason: 'sale',
          quantity: -2,
          balance_after: 18,
          order_number: 'ORD-2026-000042',
        }),
        movement({ id: 'm1', reason: 'initial', quantity: 20, balance_after: 20, note: 'Opening' }),
      ]),
    });

    const table = await screen.findByRole('table', { name: 'Stock history' });
    const [, sale, initial] = within(table).getAllByRole('row');
    expect(sale).toHaveTextContent('Sale ORD-2026-000042');
    expect(sale).toHaveTextContent('-218');
    expect(within(sale).getByRole('link', { name: 'ORD-2026-000042' })).toHaveAttribute(
      'href',
      '/admin/orders/ORD-2026-000042'
    );
    expect(initial).toHaveTextContent('Initial stock');
    expect(initial).toHaveTextContent('+2020');
    expect(initial).toHaveTextContent('Opening');
  });

  it('books damage as a negative movement', async () => {
    const fetchMock = openProduct({
      [`POST ${PRODUCT_PATH}/stock-movements`]: ok({ movement: movement({ quantity: -3 }) }),
    });

    await userEvent.selectOptions(await screen.findByLabelText('Reason'), 'damage');
    // The label follows the reason: units are typed as positive numbers
    await userEvent.type(screen.getByLabelText('Units damaged or lost'), '3');
    await userEvent.type(screen.getAllByLabelText('Note (optional)')[0], 'Dropped');
    await userEvent.click(screen.getByRole('button', { name: 'Book movement' }));

    expect(await screen.findByText('Damage booked: -3')).toBeInTheDocument();
    expect(bodyOf(fetchMock, 'POST', `${PRODUCT_PATH}/stock-movements`)).toEqual({
      reason: 'damage',
      quantity: -3,
      note: 'Dropped',
    });
  });

  it('checks the quantity per reason before sending', async () => {
    const fetchMock = openProduct();

    await userEvent.type(await screen.findByLabelText('Units received'), '-5');
    await userEvent.click(screen.getByRole('button', { name: 'Book movement' }));
    expect(await screen.findByText('Enter a whole number greater than 0')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Reason'), 'adjustment');
    const change = screen.getByLabelText('Change (e.g. 5 or -5)');
    await userEvent.clear(change);
    await userEvent.type(change, '0');
    await userEvent.click(screen.getByRole('button', { name: 'Book movement' }));
    expect(
      await screen.findByText('Enter a whole number other than 0, e.g. 5 or -5')
    ).toBeInTheDocument();

    expect(bodyOf(fetchMock, 'POST', `${PRODUCT_PATH}/stock-movements`)).toBeUndefined();
  });

  it('shows when the stock would go below 0', async () => {
    openProduct({
      [`POST ${PRODUCT_PATH}/stock-movements`]: fail(
        409,
        'Stock cannot go below 0 (current stock: 20)'
      ),
    });

    await userEvent.selectOptions(await screen.findByLabelText('Reason'), 'damage');
    await userEvent.type(screen.getByLabelText('Units damaged or lost'), '25');
    await userEvent.click(screen.getByRole('button', { name: 'Book movement' }));

    const form = screen.getByRole('form', { name: 'Book a stock movement' });
    expect(await within(form).findByRole('alert')).toHaveTextContent('Stock cannot go below 0');
  });

  it('sets the counted stock; the same number sends nothing', async () => {
    const fetchMock = openProduct({ [`PATCH ${PRODUCT_PATH}/stock`]: ok(product) });

    const counted = await screen.findByLabelText('Counted stock');
    await userEvent.type(counted, '20');
    await userEvent.click(screen.getByRole('button', { name: 'Set stock' }));
    expect(await screen.findByText('Stock already is 20, nothing changed')).toBeInTheDocument();
    expect(bodyOf(fetchMock, 'PATCH', `${PRODUCT_PATH}/stock`)).toBeUndefined();

    await userEvent.type(counted, '18');
    await userEvent.type(screen.getAllByLabelText('Note (optional)')[1], 'Yearly inventory');
    await userEvent.click(screen.getByRole('button', { name: 'Set stock' }));
    expect(await screen.findByText('Stock set to 18')).toBeInTheDocument();
    expect(bodyOf(fetchMock, 'PATCH', `${PRODUCT_PATH}/stock`)).toEqual({
      stock_quantity: 18,
      note: 'Yearly inventory',
    });
  });
});

describe('images', () => {
  it('lists the images, the first one is the main image', async () => {
    openProduct();

    const list = await screen.findByRole('list', { name: 'Product images' });
    const [first, second] = within(list).getAllByRole('listitem');
    expect(first).toHaveTextContent('Main image');
    expect(first).toHaveTextContent('Front view');
    expect(within(first).getByRole('button', { name: 'Move image 1 up' })).toBeDisabled();
    expect(
      within(first).queryByRole('button', { name: /make image 1 the main image/i })
    ).not.toBeInTheDocument();
    expect(within(second).getByRole('button', { name: 'Move image 2 down' })).toBeDisabled();
  });

  it('sends the complete new order when an image is moved or made the main image', async () => {
    const fetchMock = openProduct({
      [`PUT ${PRODUCT_PATH}/images/order`]: ok({ images: [side, front] }),
    });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Make image 2 the main image' })
    );

    expect(await screen.findByText('Main image changed')).toBeInTheDocument();
    expect(bodyOf(fetchMock, 'PUT', `${PRODUCT_PATH}/images/order`)).toEqual({
      image_ids: [side.id, front.id],
    });
  });

  it('adds an image by URL and refuses non-http URLs', async () => {
    const added: ProductImage = {
      id: 'i3',
      url: 'https://img.example/top.png',
      alt_text: 'Top view',
      sort_order: 2,
    };
    const fetchMock = openProduct({ [`POST ${PRODUCT_PATH}/images`]: ok({ image: added }) });

    const url = await screen.findByLabelText('Image URL');
    await userEvent.type(url, 'javascript:alert(1)');
    await userEvent.click(screen.getByRole('button', { name: 'Add image' }));
    expect(
      await screen.findByText('Enter an image URL starting with https://')
    ).toBeInTheDocument();

    await userEvent.clear(url);
    await userEvent.type(url, added.url);
    await userEvent.type(screen.getByLabelText('Description for screen readers'), 'Top view');
    await userEvent.click(screen.getByRole('button', { name: 'Add image' }));

    expect(await screen.findByText('Image added')).toBeInTheDocument();
    expect(bodyOf(fetchMock, 'POST', `${PRODUCT_PATH}/images`)).toEqual({
      url: added.url,
      alt_text: 'Top view',
    });
  });

  it('asks before deleting an image', async () => {
    const fetchMock = openProduct({ [`DELETE ${PRODUCT_PATH}/images/${side.id}`]: ok() });

    await userEvent.click(await screen.findByRole('button', { name: 'Delete image 2' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete image 2?' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Image deleted')).toBeInTheDocument();
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([u, init]) => u === `/api${PRODUCT_PATH}/images/${side.id}` && init?.method === 'DELETE'
        )
      ).toBe(true)
    );
  });

  it('hides the add form at 10 images', async () => {
    const images = Array.from({ length: 10 }, (_, i) => ({ ...front, id: `i${i}`, sort_order: i }));
    openProduct({ [`GET ${PRODUCT_PATH}`]: ok({ ...product, images }) });

    expect(await screen.findByText(/at most 10 images/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Image URL')).not.toBeInTheDocument();
  });
});
