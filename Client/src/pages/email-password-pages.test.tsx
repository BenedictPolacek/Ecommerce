import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { fail, mockApi, ok, sequence } from '@/test/mock-api';
import { buildUser, renderRoute } from '@/test/render';

const visitor = { 'GET /users/me': fail(401), 'POST /auth/refresh': fail(401) };
const unverifiedJane = buildUser({ email_verified_at: null });

const requestsTo = (fetchMock: ReturnType<typeof mockApi>, path: string) =>
  fetchMock.mock.calls.filter(([url]) => url === `/api${path}`);

const bodyOf = (fetchMock: ReturnType<typeof mockApi>, path: string) =>
  JSON.parse(requestsTo(fetchMock, path)[0][1]?.body as string);

describe('verify email page', () => {
  it('explains when the token is missing', async () => {
    mockApi(visitor);
    renderRoute('/verify-email');

    expect(await screen.findByRole('heading', { name: 'Invalid link' })).toBeInTheDocument();
  });

  it('only sends the token after a click (mail scanners must not use it up)', async () => {
    const fetchMock = mockApi({ ...visitor, 'POST /auth/verify-email': ok() });
    renderRoute('/verify-email?token=abc123');

    const button = await screen.findByRole('button', { name: 'Confirm email' });
    expect(requestsTo(fetchMock, '/auth/verify-email')).toHaveLength(0);

    await userEvent.click(button);

    expect(await screen.findByRole('heading', { name: 'Email verified' })).toBeInTheDocument();
    expect(bodyOf(fetchMock, '/auth/verify-email')).toEqual({ token: 'abc123' });
  });

  it('shows the error and offers a new email to a logged-in user', async () => {
    mockApi({
      'GET /users/me': ok({ user: unverifiedJane }),
      'POST /auth/verify-email': fail(
        400,
        'Invalid or expired verification link. Please request a new one.'
      ),
    });
    renderRoute('/verify-email?token=expired');

    await userEvent.click(await screen.findByRole('button', { name: 'Confirm email' }));

    expect(await screen.findByText(/invalid or expired verification link/i)).toBeInTheDocument();
    // One in the banner, one on the page
    expect(screen.getAllByRole('button', { name: 'Resend email' })).toHaveLength(2);
  });

  it('hides the banner once the logged-in user is verified', async () => {
    mockApi({
      'GET /users/me': sequence(ok({ user: unverifiedJane }), ok({ user: buildUser() })),
      'POST /auth/verify-email': ok(),
    });
    renderRoute('/verify-email?token=abc123');

    expect(await screen.findByText(/please confirm your email/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirm email' }));

    expect(await screen.findByRole('heading', { name: 'Email verified' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText(/please confirm your email/i)).not.toBeInTheDocument()
    );
  });
});

describe('verify email banner', () => {
  it('is not shown to verified users', async () => {
    mockApi({ 'GET /users/me': ok({ user: buildUser() }) });
    renderRoute('/');

    expect(await screen.findByRole('link', { name: 'Jane' })).toBeInTheDocument();
    expect(screen.queryByText(/please confirm your email/i)).not.toBeInTheDocument();
  });

  it('resends the verification email', async () => {
    const fetchMock = mockApi({
      'GET /users/me': ok({ user: unverifiedJane }),
      'POST /auth/verify-email/resend': ok(),
    });
    renderRoute('/');

    await userEvent.click(await screen.findByRole('button', { name: 'Resend email' }));

    expect(await screen.findByText('Verification email sent')).toBeInTheDocument();
    expect(requestsTo(fetchMock, '/auth/verify-email/resend')).toHaveLength(1);
  });

  it('shows the rate limit message from the server', async () => {
    mockApi({
      'GET /users/me': ok({ user: unverifiedJane }),
      'POST /auth/verify-email/resend': fail(
        429,
        'Please wait a minute before requesting another email.'
      ),
    });
    renderRoute('/');

    await userEvent.click(await screen.findByRole('button', { name: 'Resend email' }));

    expect(
      await screen.findByText('Please wait a minute before requesting another email.')
    ).toBeInTheDocument();
  });
});

describe('forgot password page', () => {
  it('is linked from the login page', async () => {
    mockApi(visitor);
    renderRoute('/login');

    await userEvent.click(await screen.findByRole('link', { name: 'Forgot your password?' }));

    expect(
      await screen.findByRole('heading', { name: 'Forgot your password?' })
    ).toBeInTheDocument();
  });

  it('sends the reset link and gives the same answer for every email', async () => {
    const fetchMock = mockApi({ ...visitor, 'POST /auth/forgot-password': ok() });
    renderRoute('/forgot-password');

    await userEvent.type(await screen.findByLabelText('Email'), 'jane@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }));

    expect(await screen.findByRole('heading', { name: 'Check your inbox' })).toBeInTheDocument();
    expect(screen.getByText(/if an account exists for jane@example.com/i)).toBeInTheDocument();
    expect(bodyOf(fetchMock, '/auth/forgot-password')).toEqual({ email: 'jane@example.com' });
  });
});

describe('reset password page', () => {
  const fillForm = async (password: string, confirmPassword = password) => {
    await userEvent.type(await screen.findByLabelText('New password'), password);
    await userEvent.type(screen.getByLabelText('Repeat new password'), confirmPassword);
    await userEvent.click(screen.getByRole('button', { name: 'Set new password' }));
  };

  it('explains when the token is missing', async () => {
    mockApi(visitor);
    renderRoute('/reset-password');

    expect(await screen.findByRole('heading', { name: 'Invalid link' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Request a new link' })).toBeInTheDocument();
  });

  it('catches typos in the repeated password before calling the API', async () => {
    const fetchMock = mockApi(visitor);
    renderRoute('/reset-password?token=abc123');

    await fillForm('newSecret1', 'newSecret2');

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(requestsTo(fetchMock, '/auth/reset-password')).toHaveLength(0);
  });

  it('sets the new password and sends the user to the login', async () => {
    const fetchMock = mockApi({ ...visitor, 'POST /auth/reset-password': ok() });
    const { router } = renderRoute('/reset-password?token=abc123');

    await fillForm('newSecret1');

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(await screen.findByText('Password changed')).toBeInTheDocument();
    expect(bodyOf(fetchMock, '/auth/reset-password')).toEqual({
      token: 'abc123',
      password: 'newSecret1',
    });
  });

  it('logs out a user who was logged in in this browser', async () => {
    // Like the real server: the reset revokes all sessions, so afterwards /users/me is 401
    mockApi({
      'GET /users/me': sequence(ok({ user: buildUser() }), fail(401)),
      'POST /auth/refresh': fail(401),
      'POST /auth/reset-password': ok(),
    });
    renderRoute('/reset-password?token=abc123');

    expect(await screen.findByRole('link', { name: 'Jane' })).toBeInTheDocument();
    await fillForm('newSecret1');

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Jane' })).not.toBeInTheDocument();
  });

  it('shows the error for an expired link', async () => {
    mockApi({
      ...visitor,
      'POST /auth/reset-password': fail(
        400,
        'Invalid or expired password reset link. Please request a new one.'
      ),
    });
    renderRoute('/reset-password?token=expired');

    await fillForm('newSecret1');

    expect(await screen.findByText(/invalid or expired password reset link/i)).toBeInTheDocument();
  });
});
