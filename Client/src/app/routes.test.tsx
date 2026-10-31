import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { fail, mockApi, ok } from '@/test/mock-api';
import { buildUser, renderRoute } from '@/test/render';

const loggedOut = () => mockApi({ 'GET /users/me': fail(401), 'POST /auth/refresh': fail(401) });

const loggedInAs = (role: 'customer' | 'admin' = 'customer') =>
  mockApi({
    'GET /users/me': ok({ user: buildUser({ role }) }),
    'POST /auth/logout': ok(),
  });

describe('routing', () => {
  it('renders the home page inside the layout', async () => {
    loggedOut();
    renderRoute('/');

    expect(await screen.findByRole('heading', { name: /welcome/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ecommerce Shop' })).toBeInTheDocument();
  });

  it('shows a not found page for unknown URLs', async () => {
    loggedOut();
    renderRoute('/does-not-exist');

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });
});

describe('auth state in the header', () => {
  it('shows a login link for visitors', async () => {
    loggedOut();
    renderRoute('/');

    expect(await screen.findByRole('link', { name: 'Log in' })).toBeInTheDocument();
  });

  it('shows the user name and logs out', async () => {
    const fetchMock = loggedInAs('customer');
    renderRoute('/');

    expect(await screen.findByRole('link', { name: 'Jane' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.anything());
  });
});

describe('protected routes', () => {
  it('sends visitors to the login page and remembers where they wanted to go', async () => {
    loggedOut();
    const { router } = renderRoute('/account?tab=orders');

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(router.state.location.search).toBe(
      `?redirect=${encodeURIComponent('/account?tab=orders')}`
    );
  });

  it('lets logged-in users in', async () => {
    loggedInAs('customer');
    renderRoute('/account');

    expect(await screen.findByRole('heading', { name: 'My account' })).toBeInTheDocument();
  });

  it('denies the admin area to customers', async () => {
    loggedInAs('customer');
    renderRoute('/admin');

    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
  });

  it('lets admins into the admin area', async () => {
    loggedInAs('admin');
    renderRoute('/admin');

    expect(await screen.findByRole('heading', { name: 'Admin' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Admin' })).toBeInTheDocument();
  });
});
