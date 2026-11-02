import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Cart } from '@/features/cart/types';
import { buildOrder, homeAddress } from '@/test/fixtures';
import { emptyCart, fail, mockApi, ok } from '@/test/mock-api';
import { buildUser, renderRoute } from '@/test/render';

const cart: Cart = {
  ...emptyCart,
  items: [
    {
      cart_item_id: 'ci-1',
      cart_id: 'cart-1',
      product_id: 'p0000000-0000-4000-8000-000000000001',
      product_name: 'Desk Lamp',
      product_slug: 'desk-lamp',
      primary_image: null,
      sku: 'LAMP-1',
      price_cents: 2500,
      stock_quantity: 10,
      is_active: true,
      quantity: 2,
      line_total_cents: 5000,
      created_at: '2026-10-01T10:00:00.000Z',
      updated_at: '2026-10-01T10:00:00.000Z',
    },
  ],
  totalItems: 2,
  subtotalCents: 5000,
  taxCents: 798,
  totalCents: 5000,
};

const home = homeAddress;
const order = buildOrder();

const checkout = (
  { addresses = [home], verified = true } = {},
  extra: Parameters<typeof mockApi>[0] = {}
) =>
  mockApi({
    'GET /users/me': ok({
      user: buildUser({ email_verified_at: verified ? '2026-10-01T10:00:00.000Z' : null }),
    }),
    'GET /cart': ok({ cart }),
    'GET /addresses': ok({ addresses }),
    'POST /orders': ok({ order }),
    ...extra,
  });

const requests = (fetchMock: ReturnType<typeof mockApi>, method: string, path: string) =>
  fetchMock.mock.calls.filter(([url, init]) => url === `/api${path}` && init?.method === method);

const bodyOf = (fetchMock: ReturnType<typeof mockApi>, method: string, path: string, n = 0) =>
  JSON.parse(requests(fetchMock, method, path)[n][1]?.body as string);

const placeOrderButton = () => screen.findByRole('button', { name: /place order/i });

const fillNewAddress = async (section: HTMLElement) => {
  const scope = within(section);
  await userEvent.type(scope.getByLabelText('Street and number'), 'Lindenweg 5');
  await userEvent.type(scope.getByLabelText('Postal code'), '1010');
  await userEvent.type(scope.getByLabelText('City'), 'Vienna');
  await userEvent.selectOptions(scope.getByLabelText('Country'), 'AT');
};

describe('checkout', () => {
  it('orders with the preselected default address and shows the bank details', async () => {
    const fetchMock = checkout();
    const { router } = renderRoute('/checkout');

    const radio = await screen.findByRole('radio', { name: /hauptstrasse 1/i });
    expect(radio).toBeChecked();
    expect(screen.getByText('2 × Desk Lamp')).toBeInTheDocument();

    await userEvent.click(await placeOrderButton());

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/checkout/confirmation/ORD-2026-000042')
    );
    expect(bodyOf(fetchMock, 'POST', '/orders')).toEqual({ addressId: home.id });

    expect(
      await screen.findByRole('heading', { name: 'Thank you for your order!' })
    ).toBeInTheDocument();
    const payment = screen.getByRole('region', { name: /please transfer €50.00/i });
    expect(within(payment).getByText('DE89 3704 0044 0532 0130 00')).toBeInTheDocument();
    expect(within(payment).getByText('ORD-2026-000042')).toBeInTheDocument();
    // The order came from the checkout response, it was not loaded again
    expect(requests(fetchMock, 'GET', '/orders/ORD-2026-000042')).toHaveLength(0);
  });

  it('saves a new address as default when there is none yet', async () => {
    const saved = { ...home, id: 'a0000000-0000-4000-8000-000000000002', city: 'Vienna' };
    const fetchMock = checkout({ addresses: [] }, { 'POST /addresses': ok({ address: saved }) });
    renderRoute('/checkout');

    await fillNewAddress(await screen.findByRole('region', { name: 'Shipping address' }));
    expect(screen.getByRole('checkbox', { name: /save this address/i })).toBeChecked();
    await userEvent.click(await placeOrderButton());

    await screen.findByRole('heading', { name: 'Thank you for your order!' });
    expect(bodyOf(fetchMock, 'POST', '/addresses')).toEqual({
      address_line1: 'Lindenweg 5',
      address_line2: null,
      postal_code: '1010',
      city: 'Vienna',
      state: null,
      country: 'AT',
      is_default: true,
    });
    expect(bodyOf(fetchMock, 'POST', '/orders')).toEqual({ addressId: saved.id });
  });

  it('sends a new address with the order when it should not be saved', async () => {
    const fetchMock = checkout();
    renderRoute('/checkout');

    await userEvent.click(await screen.findByRole('radio', { name: 'Use a new address' }));
    await fillNewAddress(screen.getByRole('region', { name: 'Shipping address' }));
    await userEvent.click(screen.getByRole('checkbox', { name: /save this address/i }));
    await userEvent.click(await placeOrderButton());

    await screen.findByRole('heading', { name: 'Thank you for your order!' });
    expect(requests(fetchMock, 'POST', '/addresses')).toHaveLength(0);
    expect(bodyOf(fetchMock, 'POST', '/orders')).toEqual({
      shippingAddress: {
        address_line1: 'Lindenweg 5',
        address_line2: null,
        postal_code: '1010',
        city: 'Vienna',
        state: null,
        country: 'AT',
      },
    });
  });

  it('validates a new address before calling the API', async () => {
    const fetchMock = checkout({ addresses: [] });
    renderRoute('/checkout');

    await userEvent.click(await placeOrderButton());

    expect(await screen.findByText('Street and number are required')).toBeInTheDocument();
    expect(screen.getByText('City is required')).toBeInTheDocument();
    expect(requests(fetchMock, 'POST', '/orders')).toHaveLength(0);
  });

  it('sends a different billing address', async () => {
    const fetchMock = checkout();
    renderRoute('/checkout');

    await userEvent.click(
      await screen.findByRole('checkbox', { name: 'Same as shipping address' })
    );
    const billing = screen.getByRole('region', { name: 'Billing address' });
    await userEvent.click(within(billing).getByRole('radio', { name: 'Use a new address' }));
    await fillNewAddress(billing);
    await userEvent.click(await placeOrderButton());

    await screen.findByRole('heading', { name: 'Thank you for your order!' });
    expect(bodyOf(fetchMock, 'POST', '/orders')).toEqual({
      addressId: home.id,
      billingAddress: expect.objectContaining({ city: 'Vienna', country: 'AT' }),
    });
  });

  it('does not save the address twice when the order fails and is retried', async () => {
    const saved = { ...home, id: 'a0000000-0000-4000-8000-000000000002' };
    let attempt = 0;
    const fetchMock = checkout(
      { addresses: [] },
      {
        'POST /addresses': ok({ address: saved }),
        'POST /orders': () =>
          ++attempt === 1 ? fail(400, 'Product "Desk Lamp" is no longer available') : ok({ order }),
      }
    );
    renderRoute('/checkout');

    await fillNewAddress(await screen.findByRole('region', { name: 'Shipping address' }));
    await userEvent.click(await placeOrderButton());
    expect(
      await screen.findByText('Product "Desk Lamp" is no longer available')
    ).toBeInTheDocument();

    await userEvent.click(await placeOrderButton());

    await screen.findByRole('heading', { name: 'Thank you for your order!' });
    expect(requests(fetchMock, 'POST', '/addresses')).toHaveLength(1);
    expect(bodyOf(fetchMock, 'POST', '/orders', 1)).toEqual({ addressId: saved.id });
  });

  it('asks unverified users to confirm their email first', async () => {
    checkout({ verified: false });
    renderRoute('/checkout');

    expect(await screen.findByText('Please confirm your email address')).toBeInTheDocument();
    expect(await placeOrderButton()).toBeDisabled();
  });

  it('shows a message for an empty cart', async () => {
    checkout({}, { 'GET /cart': ok({ cart: emptyCart }) });
    renderRoute('/checkout');

    expect(await screen.findByRole('heading', { name: 'Your cart is empty' })).toBeInTheDocument();
  });

  it('sends the user back to the cart when items have problems', async () => {
    const soldOut = { ...cart, items: [{ ...cart.items[0], stock_quantity: 0 }] };
    checkout({}, { 'GET /cart': ok({ cart: soldOut }) });
    renderRoute('/checkout');

    expect(
      await screen.findByRole('heading', { name: 'Some items need your attention' })
    ).toBeInTheDocument();
  });
});

describe('order confirmation page', () => {
  it('loads the order when opened directly', async () => {
    checkout({}, { 'GET /orders/ORD-2026-000042': ok({ order }) });
    renderRoute('/checkout/confirmation/ORD-2026-000042');

    expect(await screen.findByText('ORD-2026-000042', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('Incl. 19% VAT')).toBeInTheDocument();
  });

  it('shows "not found" for an unknown order', async () => {
    checkout({}, { 'GET /orders/ORD-1': fail(404, 'Order not found') });
    renderRoute('/checkout/confirmation/ORD-1');

    expect(await screen.findByRole('heading', { name: 'Order not found' })).toBeInTheDocument();
  });
});
