import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Address } from '@/features/addresses/types';
import { homeAddress } from '@/test/fixtures';
import { mockApi, ok, sequence } from '@/test/mock-api';
import { buildUser, renderRoute } from '@/test/render';

const office: Address = {
  ...homeAddress,
  id: 'a0000000-0000-4000-8000-000000000002',
  address_line1: 'Bürostrasse 9',
  address_line2: 'Floor 3',
  city: 'Munich',
  postal_code: '80331',
  is_default: false,
};

const withAddresses = (
  addresses: ReturnType<typeof sequence> | ReturnType<typeof ok>,
  extra: Parameters<typeof mockApi>[0] = {}
) => mockApi({ 'GET /users/me': ok({ user: buildUser() }), 'GET /addresses': addresses, ...extra });

const list = (...addresses: Address[]) => ok({ addresses });

const requests = (fetchMock: ReturnType<typeof mockApi>, method: string, path: string) =>
  fetchMock.mock.calls.filter(([url, init]) => url === `/api${path}` && init?.method === method);

const bodyOf = (fetchMock: ReturnType<typeof mockApi>, method: string, path: string) =>
  JSON.parse(requests(fetchMock, method, path)[0][1]?.body as string);

describe('address book', () => {
  it('is reachable from the account menu', async () => {
    withAddresses(list());
    renderRoute('/account/addresses');

    const menu = await screen.findByRole('navigation', { name: 'Account' });
    expect(within(menu).getByRole('link', { name: 'Addresses' })).toHaveAttribute(
      'aria-current',
      'page'
    );
  });

  it('adds the first address as default address', async () => {
    const fetchMock = withAddresses(sequence(list(), list(homeAddress)), {
      'POST /addresses': ok({ address: homeAddress }),
    });
    renderRoute('/account/addresses');

    expect(await screen.findByText(/no saved addresses yet/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Add address' }));

    const dialog = await screen.findByRole('dialog', { name: 'Add address' });
    expect(within(dialog).getByRole('checkbox', { name: 'Use as default address' })).toBeChecked();
    await userEvent.type(within(dialog).getByLabelText('Street and number'), 'Hauptstrasse 1');
    await userEvent.type(within(dialog).getByLabelText('Postal code'), '10115');
    await userEvent.type(within(dialog).getByLabelText('City'), 'Berlin');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save address' }));

    expect(await screen.findByText('Address added')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(bodyOf(fetchMock, 'POST', '/addresses')).toEqual({
      address_line1: 'Hauptstrasse 1',
      address_line2: null,
      postal_code: '10115',
      city: 'Berlin',
      state: null,
      country: 'DE',
      is_default: true,
    });
    // The list is loaded again and shows the new address
    expect(await screen.findByText('Default')).toBeInTheDocument();
  });

  it('validates the address before saving', async () => {
    const fetchMock = withAddresses(list());
    renderRoute('/account/addresses');

    await userEvent.click(await screen.findByRole('button', { name: 'Add address' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save address' }));

    expect(await within(dialog).findByText('Street and number are required')).toBeInTheDocument();
    expect(requests(fetchMock, 'POST', '/addresses')).toHaveLength(0);
  });

  it('edits an address with its current values prefilled', async () => {
    const fetchMock = withAddresses(list(homeAddress, office), {
      [`PUT /addresses/${office.id}`]: ok({ address: { ...office, city: 'Augsburg' } }),
    });
    renderRoute('/account/addresses');

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Bürostrasse 9' }));
    const dialog = await screen.findByRole('dialog', { name: 'Edit address' });
    expect(within(dialog).getByLabelText('Address line 2 (optional)')).toHaveValue('Floor 3');

    const city = within(dialog).getByLabelText('City');
    await userEvent.clear(city);
    await userEvent.type(city, 'Augsburg');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save address' }));

    expect(await screen.findByText('Address updated')).toBeInTheDocument();
    expect(bodyOf(fetchMock, 'PUT', `/addresses/${office.id}`)).toEqual({
      address_line1: 'Bürostrasse 9',
      address_line2: 'Floor 3',
      postal_code: '80331',
      city: 'Augsburg',
      state: null,
      country: 'DE',
      is_default: false,
    });
  });

  it('makes another address the default', async () => {
    const fetchMock = withAddresses(list(homeAddress, office), {
      [`PUT /addresses/${office.id}`]: ok({ address: { ...office, is_default: true } }),
    });
    renderRoute('/account/addresses');

    // The default address offers no "set as default"
    await screen.findByRole('button', { name: 'Edit Hauptstrasse 1' });
    expect(
      screen.queryByRole('button', { name: 'Set Hauptstrasse 1 as default' })
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Set Bürostrasse 9 as default' }));

    expect(await screen.findByText('Default address changed')).toBeInTheDocument();
    expect(bodyOf(fetchMock, 'PUT', `/addresses/${office.id}`)).toEqual({ is_default: true });
  });

  it('asks before deleting an address', async () => {
    const fetchMock = withAddresses(sequence(list(homeAddress, office), list(homeAddress)), {
      [`DELETE /addresses/${office.id}`]: ok(),
    });
    renderRoute('/account/addresses');

    await userEvent.click(await screen.findByRole('button', { name: 'Delete Bürostrasse 9' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Keep address' }));
    expect(requests(fetchMock, 'DELETE', `/addresses/${office.id}`)).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: 'Delete Bürostrasse 9' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent(/past orders keep their address/i);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Address deleted')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Bürostrasse 9')).not.toBeInTheDocument());
  });
});
