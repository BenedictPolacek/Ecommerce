import { jest } from '@jest/globals';
import { logger } from '../../src/config/logger.js';
import { outbox } from '../../src/mail/mailer.js';
import { resetDatabase, closeDatabase, query } from './helpers/db.js';
import {
  api,
  authHeader,
  createAdmin,
  createProduct,
  createUser,
  shippingAddress,
} from './helpers/factories.js';

/**
 * Google and GitHub are replaced by a fetch stub: the tests drive the real flow
 * (redirect → provider → callback) through openid-client without any network access.
 */

const APP_URL = 'http://localhost:3000';

const GOOGLE_METADATA = {
  issuer: 'https://accounts.google.com',
  authorization_endpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  token_endpoint: 'https://oauth2.googleapis.com/token',
  jwks_uri: 'https://www.googleapis.com/oauth2/v3/certs',
  response_types_supported: ['code'],
  subject_types_supported: ['public'],
  id_token_signing_alg_values_supported: ['RS256'],
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const base64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

/** An ID token as Google would return it from the token endpoint */
const idToken = (claims) => {
  const now = Math.floor(Date.now() / 1000);
  return [
    base64url({ alg: 'RS256', kid: 'test-key', typ: 'JWT' }),
    base64url({
      iss: GOOGLE_METADATA.issuer,
      aud: 'test-google-client',
      iat: now,
      exp: now + 3600,
      ...claims,
    }),
    // Tokens from the token endpoint come over TLS straight from Google: the signature is
    // not checked (OpenID Connect Core 3.1.3.7), the claims are
    'c2lnbmF0dXJl',
  ].join('.');
};

/** What the fake providers answer; set per test */
let googleUser;
let githubUser;
let githubEmails;
/** Nonce from the authorization URL: Google puts it into the ID token */
let lastNonce;
let fetchSpy;

beforeEach(async () => {
  await resetDatabase();
  outbox.length = 0;
  googleUser = {
    sub: 'google-123',
    email: 'anna@gmail.com',
    email_verified: true,
    given_name: 'Anna',
    family_name: 'Schmidt',
  };
  githubUser = { id: 4242, login: 'octocat', name: 'Mona Lisa Octocat' };
  githubEmails = [{ email: 'mona@github.test', primary: true, verified: true }];

  fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url === 'https://accounts.google.com/.well-known/openid-configuration') {
      return json(GOOGLE_METADATA);
    }
    if (url === GOOGLE_METADATA.token_endpoint) {
      return json({
        access_token: 'google-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'openid email profile',
        id_token: idToken({ ...googleUser, nonce: lastNonce }),
      });
    }
    if (url === 'https://github.com/login/oauth/access_token') {
      return json({ access_token: 'github-access-token', token_type: 'bearer', scope: 'user' });
    }
    if (url === 'https://api.github.com/user') return json(githubUser);
    if (url === 'https://api.github.com/user/emails') return json(githubEmails);
    throw new Error(`Unexpected fetch in test: ${url}`);
  });
});
afterEach(() => fetchSpy.mockRestore());
afterAll(closeDatabase);

/**
 * Starts the sign-in like the browser does and follows it back to the callback.
 * Returns the callback response (a redirect into the app or to /login?oauth_error=).
 */
async function signIn(provider, { redirect, callback = {} } = {}) {
  const start = await api()
    .get(`/api/auth/oauth/${provider}`)
    .query(redirect ? { redirect } : {});
  expect(start.status).toBe(302);

  const authUrl = new URL(start.headers.location);
  lastNonce = authUrl.searchParams.get('nonce') ?? undefined;
  const attemptCookie = start.headers['set-cookie'].find((c) => c.startsWith('oauth_attempt='));

  const params = { code: 'auth-code', state: authUrl.searchParams.get('state'), ...callback };
  return api()
    .get(`/api/auth/oauth/${provider}/callback`)
    .query(params)
    .set('Cookie', attemptCookie.split(';')[0]);
}

const cookieValue = (res, name) =>
  res.headers['set-cookie']
    ?.find((c) => c.startsWith(`${name}=`))
    ?.split(';')[0]
    .slice(name.length + 1);

const me = (res) =>
  api()
    .get('/api/users/me')
    .set(authHeader(cookieValue(res, 'token')));

const findUserByEmail = async (email) =>
  (await query('SELECT * FROM users WHERE email = $1', [email])).rows[0] ?? null;

const identities = async () =>
  (await query('SELECT user_id, provider, provider_user_id FROM user_identities')).rows;

describe('GET /auth/oauth/providers', () => {
  it('lists the configured providers', async () => {
    const res = await api().get('/api/auth/oauth/providers');

    expect(res.status).toBe(200);
    expect(res.body.data.providers).toEqual(['google', 'github']);
  });
});

describe('GET /auth/oauth/:provider', () => {
  it('sends the browser to Google with state, nonce and PKCE', async () => {
    const res = await api().get('/api/auth/oauth/google');

    expect(res.status).toBe(302);
    const url = new URL(res.headers.location);
    expect(url.origin + url.pathname).toBe(GOOGLE_METADATA.authorization_endpoint);
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: 'test-google-client',
      redirect_uri: `${APP_URL}/api/auth/oauth/google/callback`,
      response_type: 'code',
      scope: 'openid email profile',
      code_challenge_method: 'S256',
      state: expect.any(String),
      nonce: expect.any(String),
      code_challenge: expect.any(String),
    });
    const cookie = res.headers['set-cookie'].find((c) => c.startsWith('oauth_attempt='));
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Path=\/api\/auth\/oauth/);
    // The verifier stays on the server side of the flow, only its hash goes to Google
    expect(res.headers.location).not.toContain(
      decodeURIComponent(cookie).match(/"codeVerifier":"([^"]+)"/)[1]
    );
  });

  it('refuses unknown providers', async () => {
    const res = await api().get('/api/auth/oauth/facebook');

    expect(res.status).toBe(404);
  });
});

describe('GET /auth/oauth/:provider/callback', () => {
  it('creates a verified account without password and logs it in', async () => {
    const res = await signIn('google', { redirect: '/cart' });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe(`${APP_URL}/cart`);
    expect(cookieValue(res, 'refresh_token')).toBeTruthy();

    const user = await findUserByEmail('anna@gmail.com');
    expect(user).toMatchObject({ first_name: 'Anna', last_name: 'Schmidt', password_hash: null });
    expect(user.email_verified_at).not.toBeNull();
    expect(await identities()).toEqual([
      { user_id: user.id, provider: 'google', provider_user_id: 'google-123' },
    ]);
    const { rowCount } = await query('SELECT 1 FROM carts WHERE user_id = $1', [user.id]);
    expect(rowCount).toBe(1);

    const profile = await me(res);
    expect(profile.body.data.user).toMatchObject({ email: 'anna@gmail.com', has_password: false });
  });

  it('logs the same provider account into the same shop account next time', async () => {
    await signIn('google');
    // The email at Google changed: the stable id still finds the account
    googleUser.email = 'anna.new@gmail.com';

    const res = await signIn('google');

    expect(res.headers.location).toBe(`${APP_URL}/`);
    expect((await me(res)).body.data.user.email).toBe('anna@gmail.com');
    expect(await identities()).toHaveLength(1);
  });

  it('links a verified account with the same email and keeps its password', async () => {
    const existing = await createUser({ email: 'anna@gmail.com' });

    const res = await signIn('google');

    expect((await me(res)).body.data.user).toMatchObject({
      id: existing.user.id,
      has_password: true,
    });
    const login = await api()
      .post('/api/auth/login')
      .send({ email: 'anna@gmail.com', password: existing.password });
    expect(login.status).toBe(200);
  });

  it('removes the unproven password of an unverified account with the same email', async () => {
    // Someone registered with Anna's address without owning it
    const squatter = await createUser({ email: 'anna@gmail.com' }, { verified: false });

    const res = await signIn('google');

    expect((await me(res)).body.data.user).toMatchObject({
      id: squatter.user.id,
      has_password: false,
    });
    const user = await findUserByEmail('anna@gmail.com');
    expect(user.email_verified_at).not.toBeNull();
    // The squatter's password and session are gone
    const login = await api()
      .post('/api/auth/login')
      .send({ email: 'anna@gmail.com', password: squatter.password });
    expect(login.status).toBe(401);
    const oldSession = await api().get('/api/users/me').set(authHeader(squatter.token));
    expect(oldSession.status).toBe(401);
  });

  it('refuses a provider account whose email is not verified', async () => {
    googleUser.email_verified = false;

    const res = await signIn('google');

    expect(res.headers.location).toBe(`${APP_URL}/login?oauth_error=email_unverified`);
    expect(await findUserByEmail('anna@gmail.com')).toBeNull();
  });

  it('refuses a second Google account on an account that already has one', async () => {
    await signIn('google');
    googleUser.sub = 'google-other';

    const res = await signIn('google');

    expect(res.headers.location).toBe(`${APP_URL}/login?oauth_error=already_linked`);
  });

  it('signs in with GitHub using the verified primary email', async () => {
    githubEmails = [
      { email: 'old@github.test', primary: false, verified: true },
      { email: 'mona@github.test', primary: true, verified: true },
    ];

    const res = await signIn('github');

    expect(res.headers.location).toBe(`${APP_URL}/`);
    expect((await me(res)).body.data.user).toMatchObject({
      email: 'mona@github.test',
      first_name: 'Mona Lisa',
      last_name: 'Octocat',
    });
    expect(await identities()).toEqual([
      expect.objectContaining({ provider: 'github', provider_user_id: '4242' }),
    ]);
  });

  it('accepts the issuer GitHub sends on the callback (RFC 9207)', async () => {
    const res = await signIn('github', { callback: { iss: 'https://github.com/login/oauth' } });

    expect(res.headers.location).toBe(`${APP_URL}/`);
  });

  it('refuses a GitHub callback from another issuer (mix-up attack)', async () => {
    const res = await signIn('github', { callback: { iss: 'https://evil.example' } });

    expect(res.headers.location).toBe(`${APP_URL}/login?oauth_error=failed`);
  });

  it('refuses a GitHub account whose primary email is not verified', async () => {
    githubEmails = [{ email: 'mona@github.test', primary: true, verified: false }];

    const res = await signIn('github');

    expect(res.headers.location).toBe(`${APP_URL}/login?oauth_error=email_unverified`);
  });

  it('only redirects to paths inside the app', async () => {
    for (const redirect of ['//evil.example', 'https://evil.example', '/\\evil.example']) {
      await resetDatabase();
      const res = await signIn('google', { redirect });
      expect(res.headers.location).toBe(`${APP_URL}/`);
    }
  });

  it('fails when the state does not match (login CSRF)', async () => {
    const warn = jest.spyOn(logger, 'warn');

    const res = await signIn('google', { callback: { state: 'forged-state' } });

    expect(res.headers.location).toBe(`${APP_URL}/login?oauth_error=failed`);
    expect(await findUserByEmail('anna@gmail.com')).toBeNull();
    // openid-client refused the response; the reason is logged for the developers
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' }),
      'OAuth sign-in failed'
    );
    warn.mockRestore();
  });

  it('fails without the cookie of the login attempt', async () => {
    const res = await api()
      .get('/api/auth/oauth/google/callback')
      .query({ code: 'auth-code', state: 'any' });

    expect(res.headers.location).toBe(`${APP_URL}/login?oauth_error=failed`);
  });

  it('reports a cancelled sign-in and clears the attempt cookie', async () => {
    const res = await signIn('google', { callback: { error: 'access_denied', code: undefined } });

    expect(res.headers.location).toBe(`${APP_URL}/login?oauth_error=cancelled`);
    expect(res.headers['set-cookie'].join('\n')).toMatch(/oauth_attempt=;/);
  });
});

describe('accounts without a password', () => {
  const passwordless = async () => {
    const res = await signIn('google');
    return { token: cookieValue(res, 'token') };
  };

  it('cannot log in with a password (same answer as a wrong one)', async () => {
    await passwordless();

    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'anna@gmail.com', password: 'whatever123' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('is told to set a password before changing it or deleting the account', async () => {
    const { token } = await passwordless();

    const change = await api()
      .patch('/api/users/me/password')
      .set(authHeader(token))
      .send({ currentPassword: 'x', newPassword: 'new-password123' });
    const remove = await api()
      .delete('/api/users/me')
      .set(authHeader(token))
      .send({ password: 'x' });

    for (const res of [change, remove]) {
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/no password yet/);
    }
  });

  it('sets a password with the reset link', async () => {
    await passwordless();

    await api().post('/api/auth/forgot-password').send({ email: 'anna@gmail.com' });
    // The token is only in the email link, like for a real user
    const link = outbox.at(-1).text.match(/https?:\/\/\S+/)[0];
    const token = new URL(link).searchParams.get('token');
    const reset = await api()
      .post('/api/auth/reset-password')
      .send({ token, password: 'my-new-password' });

    expect(reset.status).toBe(200);
    const login = await api()
      .post('/api/auth/login')
      .send({ email: 'anna@gmail.com', password: 'my-new-password' });
    expect(login.status).toBe(200);
    expect(login.body.data.user.has_password).toBe(true);
  });

  it('loses the link when the account is deleted (anonymized)', async () => {
    const { token } = await passwordless();
    const user = await findUserByEmail('anna@gmail.com');
    // A completed order (checkout works right away: Google verified the email), so the
    // account is anonymized, not removed
    const admin = await createAdmin();
    const product = await createProduct(admin.token);
    await api()
      .post('/api/cart/items')
      .set(authHeader(token))
      .send({ productId: product.id, quantity: 1 });
    const order = await api().post('/api/orders').set(authHeader(token)).send({ shippingAddress });
    expect(order.status).toBe(201);
    await query("UPDATE orders SET status = 'delivered' WHERE id = $1", [order.body.data.order.id]);

    const res = await api().delete(`/api/users/${user.id}`).set(authHeader(admin.token));

    expect(res.status).toBe(200);
    expect(await identities()).toEqual([]);
    // Signing in with the same Google account again starts a fresh account
    const again = await signIn('google');
    expect((await me(again)).body.data.user.id).not.toBe(user.id);
  });
});
