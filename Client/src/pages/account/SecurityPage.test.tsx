import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Session } from '@/features/account/types';
import { fail, mockApi, ok, sequence } from '@/test/mock-api';
import { buildUser, renderRoute } from '@/test/render';

const WINDOWS_CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

const thisDevice: Session = {
  id: 'e0000000-0000-4000-8000-000000000001',
  user_agent: WINDOWS_CHROME,
  created_at: '2026-10-20T08:00:00.000Z',
  last_used_at: '2026-11-03T09:00:00.000Z',
  expires_at: '2026-11-10T09:00:00.000Z',
  current: true,
};

const phone: Session = {
  ...thisDevice,
  id: 'e0000000-0000-4000-8000-000000000002',
  user_agent: IPHONE_SAFARI,
  last_used_at: '2026-11-01T18:30:00.000Z',
  current: false,
};

const sessions = (...list: Session[]) => ok({ sessions: list });

/** Logged in until the session ends: afterwards /users/me answers 401, like the real server */
const loggedIn = (extra: Parameters<typeof mockApi>[0] = {}) =>
  mockApi({
    'GET /users/me': ok({ user: buildUser() }),
    'POST /auth/refresh': fail(401),
    'GET /auth/sessions': sessions(thisDevice, phone),
    ...extra,
  });

const requests = (fetchMock: ReturnType<typeof mockApi>, method: string, path: string) =>
  fetchMock.mock.calls.filter(([url, init]) => url === `/api${path}` && init?.method === method);

describe('security page', () => {
  it('lists the logged-in devices with readable names', async () => {
    loggedIn();
    renderRoute('/account/security');

    const menu = await screen.findByRole('navigation', { name: 'Account' });
    expect(within(menu).getByRole('link', { name: 'Security' })).toHaveAttribute(
      'aria-current',
      'page'
    );

    const list = await screen.findByRole('list', { name: 'Logged-in devices' });
    const [first, second] = within(list).getAllByRole('listitem');
    expect(first).toHaveTextContent('Chrome on Windows');
    expect(first).toHaveTextContent('This device');
    // This device logs out via the header, not here
    expect(within(first).queryByRole('button')).not.toBeInTheDocument();
    expect(second).toHaveTextContent('Safari on iOS');
    expect(within(second).getByRole('button', { name: /log out safari on ios/i })).toBeVisible();
  });

  it('logs out another device and reloads the list', async () => {
    const fetchMock = loggedIn({
      'GET /auth/sessions': sequence(sessions(thisDevice, phone), sessions(thisDevice)),
      [`DELETE /auth/sessions/${phone.id}`]: ok(),
    });
    renderRoute('/account/security');

    await userEvent.click(await screen.findByRole('button', { name: /log out safari on ios/i }));

    expect(await screen.findByText('Safari on iOS has been logged out')).toBeInTheDocument();
    expect(requests(fetchMock, 'DELETE', `/auth/sessions/${phone.id}`)).toHaveLength(1);
    const list = screen.getByRole('list', { name: 'Logged-in devices' });
    await waitFor(() => expect(within(list).getAllByRole('listitem')).toHaveLength(1));
  });

  it('logs out everywhere after confirming, this browser too', async () => {
    const fetchMock = loggedIn({
      'GET /users/me': sequence(ok({ user: buildUser() }), fail(401)),
      'POST /auth/logout-all': ok(),
    });
    const { router } = renderRoute('/account/security');

    await userEvent.click(await screen.findByRole('button', { name: 'Log out everywhere' }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent(/this includes this device/i);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Log out everywhere' }));

    expect(await screen.findByText('You have been logged out on all devices.')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Log in' })).toBeInTheDocument();
    // The shop, like a normal logout; not /login?redirect=/account/security
    expect(router.state.location).toMatchObject({ pathname: '/', search: '' });
    expect(requests(fetchMock, 'POST', '/auth/logout-all')).toHaveLength(1);
  });
});

describe('delete account', () => {
  const openDialog = async () => {
    await userEvent.click(await screen.findByRole('button', { name: 'Delete account' }));
    return screen.findByRole('dialog', { name: 'Delete your account?' });
  };

  it('asks for the password before deleting', async () => {
    const fetchMock = loggedIn();
    renderRoute('/account/security');

    const dialog = await openDialog();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete account' }));

    expect(await within(dialog).findByText('Password is required')).toBeInTheDocument();
    expect(requests(fetchMock, 'DELETE', '/users/me')).toHaveLength(0);

    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep my account' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows a wrong password at the password field', async () => {
    loggedIn({ 'DELETE /users/me': fail(400, 'Password is incorrect') });
    renderRoute('/account/security');

    const dialog = await openDialog();
    await userEvent.type(within(dialog).getByLabelText('Password'), 'wrong');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete account' }));

    expect(await within(dialog).findByText('Password is incorrect')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
  });

  it('explains why an account with open orders cannot be deleted', async () => {
    loggedIn({
      'DELETE /users/me': fail(
        409,
        'You still have open orders. Please wait until they are completed.'
      ),
    });
    renderRoute('/account/security');

    const dialog = await openDialog();
    await userEvent.type(within(dialog).getByLabelText('Password'), 'secret123');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete account' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/still have open orders/i);
  });

  it('deletes the account, logs out and goes to the shop', async () => {
    const fetchMock = loggedIn({
      'GET /users/me': sequence(ok({ user: buildUser() }), fail(401)),
      'DELETE /users/me': ok(),
    });
    const { router } = renderRoute('/account/security');

    const dialog = await openDialog();
    await userEvent.type(within(dialog).getByLabelText('Password'), 'secret123');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete account' }));

    expect(await screen.findByText('Your account has been deleted.')).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/');
    expect(await screen.findByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(JSON.parse(requests(fetchMock, 'DELETE', '/users/me')[0][1]?.body as string)).toEqual({
      password: 'secret123',
    });
  });
});
