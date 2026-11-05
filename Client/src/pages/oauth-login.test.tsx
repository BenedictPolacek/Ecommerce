import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { fail, mockApi, ok } from '@/test/mock-api';
import { buildUser, renderRoute } from '@/test/render';

const asVisitor = (extra: Parameters<typeof mockApi>[0] = {}) =>
  mockApi({
    'GET /users/me': fail(401),
    'POST /auth/refresh': fail(401),
    'GET /auth/oauth/providers': ok({ providers: ['google', 'github'] }),
    ...extra,
  });

/** Signs in only with Google: no password yet */
const googleOnly = buildUser({ email: 'anna@gmail.com', has_password: false });

describe('sign in with Google / GitHub', () => {
  it('links to the API with the page to return to', async () => {
    asVisitor();
    renderRoute('/login?redirect=/cart');

    expect(await screen.findByRole('link', { name: 'Continue with Google' })).toHaveAttribute(
      'href',
      '/api/auth/oauth/google?redirect=%2Fcart'
    );
    expect(screen.getByRole('link', { name: 'Continue with GitHub' })).toHaveAttribute(
      'href',
      '/api/auth/oauth/github?redirect=%2Fcart'
    );
  });

  it('never passes a redirect outside the app', async () => {
    asVisitor();
    renderRoute('/login?redirect=//evil.example');

    expect(await screen.findByRole('link', { name: 'Continue with Google' })).toHaveAttribute(
      'href',
      '/api/auth/oauth/google?redirect=%2F'
    );
  });

  it('shows no buttons when the server has no provider configured', async () => {
    asVisitor({ 'GET /auth/oauth/providers': ok({ providers: [] }) });
    renderRoute('/login');

    expect(await screen.findByRole('button', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /continue with/i })).not.toBeInTheDocument();
  });

  it('is offered on the register page too', async () => {
    asVisitor();
    renderRoute('/register');

    expect(await screen.findByRole('link', { name: 'Continue with GitHub' })).toBeInTheDocument();
  });

  it('explains why the sign-in did not work', async () => {
    asVisitor();
    renderRoute('/login?oauth_error=email_unverified');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your email address is not verified at Google or GitHub'
    );
  });

  it('shows a general message for unknown error codes', async () => {
    asVisitor();
    renderRoute('/login?oauth_error=something_new');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Sign-in did not work. Please try again.'
    );
  });
});

describe('accounts without a password', () => {
  it('offers to set a password by email instead of changing it', async () => {
    const fetchMock = mockApi({
      'GET /users/me': ok({ user: googleOnly }),
      'POST /auth/forgot-password': ok(),
    });
    renderRoute('/account');

    const section = (await screen.findByRole('heading', { name: 'Set a password' })).closest(
      'section'
    )!;
    expect(within(section).queryByLabelText('Current password')).not.toBeInTheDocument();
    await userEvent.click(
      within(section).getByRole('button', { name: 'Email me a link to set a password' })
    );

    expect(await screen.findByText('Check your inbox')).toBeInTheDocument();
    const call = fetchMock.mock.calls.find(([url]) => url === '/api/auth/forgot-password');
    expect(JSON.parse(call?.[1]?.body as string)).toEqual({ email: 'anna@gmail.com' });
  });

  it('asks to set a password before the account can be deleted', async () => {
    mockApi({
      'GET /users/me': ok({ user: googleOnly }),
      'GET /auth/sessions': ok({ sessions: [] }),
    });
    renderRoute('/account/security');

    expect(await screen.findByRole('link', { name: 'set a password first' })).toHaveAttribute(
      'href',
      '/account'
    );
    expect(screen.queryByRole('button', { name: /delete account/i })).not.toBeInTheDocument();
  });
});
