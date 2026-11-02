import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { fail, mockApi, ok } from '@/test/mock-api';
import { buildUser, renderRoute } from '@/test/render';

const jane = buildUser();

const withUser = (extra: Parameters<typeof mockApi>[0] = {}) =>
  mockApi({ 'GET /users/me': ok({ user: jane }), ...extra });

/** Body of the PATCH request to the path (GET /users/me for the login state has none) */
const bodyOf = (fetchMock: ReturnType<typeof mockApi>, path: string) => {
  const call = fetchMock.mock.calls.find(
    ([url, init]) => url === `/api${path}` && init?.method === 'PATCH'
  );
  return call ? JSON.parse(call[1]?.body as string) : undefined;
};

describe('account layout', () => {
  it('marks the current section in the account menu', async () => {
    withUser();
    renderRoute('/account');

    const menu = await screen.findByRole('navigation', { name: 'Account' });
    expect(within(menu).getByRole('link', { name: 'Profile' })).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(within(menu).getByRole('link', { name: 'Orders' })).toHaveAttribute('href', '/orders');
  });
});

describe('profile', () => {
  it('shows the current name and the email (read only)', async () => {
    withUser();
    renderRoute('/account');

    expect(await screen.findByLabelText('First name')).toHaveValue('Jane');
    expect(screen.getByLabelText('Last name')).toHaveValue('Doe');
    expect(screen.getByLabelText('Email')).toHaveValue('jane@example.com');
    expect(screen.getByLabelText('Email')).toBeDisabled();
    // Nothing changed yet
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('saves the name and updates the header right away', async () => {
    const fetchMock = withUser({
      'PATCH /users/me': ok({ user: { ...jane, first_name: 'Janet' } }),
    });
    renderRoute('/account');

    const firstName = await screen.findByLabelText('First name');
    await userEvent.clear(firstName);
    await userEvent.type(firstName, 'Janet');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Profile saved')).toBeInTheDocument();
    expect(bodyOf(fetchMock, '/users/me')).toEqual({ first_name: 'Janet', last_name: 'Doe' });
    expect(screen.getByRole('link', { name: 'Janet' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('does not allow an empty name', async () => {
    const fetchMock = withUser();
    renderRoute('/account');

    await userEvent.clear(await screen.findByLabelText('First name'));
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('First name is required')).toBeInTheDocument();
    expect(bodyOf(fetchMock, '/users/me')).toBeUndefined();
  });
});

describe('change password', () => {
  const fill = async (current: string, next: string, repeat = next) => {
    await userEvent.type(await screen.findByLabelText('Current password'), current);
    await userEvent.type(screen.getByLabelText('New password'), next);
    await userEvent.type(screen.getByLabelText('Repeat new password'), repeat);
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));
  };

  it('changes the password and clears the form', async () => {
    const fetchMock = withUser({ 'PATCH /users/me/password': ok() });
    renderRoute('/account');

    await fill('old-secret', 'new-secret');

    expect(await screen.findByText('Password changed')).toBeInTheDocument();
    // Only the two passwords are sent, the repetition is a client-side check
    expect(bodyOf(fetchMock, '/users/me/password')).toEqual({
      currentPassword: 'old-secret',
      newPassword: 'new-secret',
    });
    expect(screen.getByLabelText('Current password')).toHaveValue('');
    expect(screen.getByLabelText('New password')).toHaveValue('');
  });

  it('shows a wrong current password at that field (and stays logged in)', async () => {
    withUser({ 'PATCH /users/me/password': fail(400, 'Current password is incorrect') });
    renderRoute('/account');

    await fill('wrong', 'new-secret');

    expect(await screen.findByText('Current password is incorrect')).toBeInTheDocument();
    expect(screen.getByLabelText('Current password')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('link', { name: 'Jane' })).toBeInTheDocument();
  });

  it('checks the new password on the client', async () => {
    const fetchMock = withUser();
    renderRoute('/account');

    await fill('same-secret', 'same-secret', 'other-secret');

    expect(
      await screen.findByText('New password must be different from the current password')
    ).toBeInTheDocument();
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(bodyOf(fetchMock, '/users/me/password')).toBeUndefined();
  });
});
