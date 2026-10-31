import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { fail, mockApi, ok, sequence } from '@/test/mock-api';
import { buildUser, renderRoute } from '@/test/render';

const jane = buildUser();

/** Visitor at first; after a successful login/register /users/me returns the user */
const visitorThenLoggedIn = (extra: Parameters<typeof mockApi>[0]) =>
  mockApi({
    'GET /users/me': sequence(fail(401), ok({ user: jane })),
    'POST /auth/refresh': fail(401),
    ...extra,
  });

const requestsTo = (fetchMock: ReturnType<typeof mockApi>, path: string) =>
  fetchMock.mock.calls.filter(([url]) => url === `/api${path}`);

describe('login page', () => {
  it('validates the form before calling the API', async () => {
    const fetchMock = visitorThenLoggedIn({});
    renderRoute('/login');

    await userEvent.click(await screen.findByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(requestsTo(fetchMock, '/auth/login')).toHaveLength(0);
  });

  it('shows the server message for wrong credentials', async () => {
    visitorThenLoggedIn({ 'POST /auth/login': fail(401, 'Invalid email or password') });
    renderRoute('/login');

    await userEvent.type(await screen.findByLabelText('Email'), 'jane@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });

  it('logs in and returns to the page the user wanted to see', async () => {
    const fetchMock = visitorThenLoggedIn({ 'POST /auth/login': ok({ user: jane }) });
    const { router } = renderRoute(`/login?redirect=${encodeURIComponent('/account')}`);

    await userEvent.type(await screen.findByLabelText('Email'), ' jane@example.com ');
    await userEvent.type(screen.getByLabelText('Password'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/account'));
    expect(await screen.findByText('Welcome back, Jane!')).toBeInTheDocument();

    const [, init] = requestsTo(fetchMock, '/auth/login')[0];
    expect(JSON.parse(init?.body as string)).toEqual({
      email: 'jane@example.com',
      password: 'secret123',
    });
  });

  it('ignores redirects to other websites (open redirect)', async () => {
    visitorThenLoggedIn({ 'POST /auth/login': ok({ user: jane }) });
    const { router } = renderRoute('/login?redirect=//evil.example');

    await userEvent.type(await screen.findByLabelText('Email'), 'jane@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('sends logged-in users away from the login page', async () => {
    mockApi({ 'GET /users/me': ok({ user: jane }) });
    const { router } = renderRoute('/login');

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });
});

describe('register page', () => {
  const fillForm = async (password = 'secret123') => {
    await userEvent.type(await screen.findByLabelText('First name'), 'Jane');
    await userEvent.type(screen.getByLabelText('Last name'), 'Doe');
    await userEvent.type(screen.getByLabelText('Email'), 'jane@example.com');
    await userEvent.type(screen.getByLabelText('Password'), password);
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
  };

  it('checks the password length on the client', async () => {
    const fetchMock = visitorThenLoggedIn({});
    renderRoute('/register');

    await fillForm('123');

    expect(
      await screen.findByText('Password must be at least 6 characters long')
    ).toBeInTheDocument();
    expect(requestsTo(fetchMock, '/auth/register')).toHaveLength(0);
  });

  it('shows "already registered" at the email field', async () => {
    visitorThenLoggedIn({ 'POST /auth/register': fail(409, 'Email is already registered') });
    renderRoute('/register');

    await fillForm();

    expect(await screen.findByText('Email is already registered')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('shows server validation errors at the matching field', async () => {
    visitorThenLoggedIn({
      'POST /auth/register': {
        status: 400,
        body: {
          success: false,
          message: 'Validation failed',
          errors: [{ field: 'last_name', message: 'Last name is too long' }],
        },
      },
    });
    renderRoute('/register');

    await fillForm();

    expect(await screen.findByText('Last name is too long')).toBeInTheDocument();
    expect(screen.getByLabelText('Last name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('creates the account, logs in and asks to confirm the email', async () => {
    visitorThenLoggedIn({ 'POST /auth/register': ok({ user: jane }) });
    const { router } = renderRoute('/register');

    await fillForm();

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(await screen.findByText('Account created!')).toBeInTheDocument();
    expect(
      screen.getByText('We sent a confirmation link to jane@example.com.')
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Jane' })).toBeInTheDocument();
  });
});
