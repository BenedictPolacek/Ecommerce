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

beforeEach(async () => {
  await resetDatabase();
  outbox.length = 0;
});
afterAll(closeDatabase);

// The token is only ever in the email link, like for a real user
const tokenFrom = (mail) => new URL(mail.text.match(/https?:\/\/\S+/)[0]).searchParams.get('token');
const lastMailTo = (email) => outbox.filter((mail) => mail.to === email).at(-1);

const me = (token) => api().get('/api/users/me').set(authHeader(token));

describe('Email verification', () => {
  it('registration sends a verification link to the frontend and starts unverified', async () => {
    const { user } = await createUser({}, { verified: false });

    expect(user.email_verified_at).toBeNull();
    const mail = lastMailTo(user.email);
    expect(mail.subject).toMatch(/confirm your email/i);
    expect(mail.text).toContain('http://localhost:3000/verify-email?token=');
  });

  it('only stores the hash of the token', async () => {
    const { user } = await createUser({}, { verified: false });
    const token = tokenFrom(lastMailTo(user.email));

    const { rows } = await query('SELECT token_hash FROM user_tokens');
    expect(rows).toHaveLength(1);
    expect(rows[0].token_hash).not.toBe(token);
  });

  it('verifies the email with the token, which works only once', async () => {
    const { user, token: accessToken } = await createUser({}, { verified: false });
    const token = tokenFrom(lastMailTo(user.email));

    const res = await api().post('/api/auth/verify-email').send({ token });
    const again = await api().post('/api/auth/verify-email').send({ token });

    expect(res.status).toBe(200);
    expect(again.status).toBe(400);
    expect((await me(accessToken)).body.data.user.email_verified_at).not.toBeNull();
  });

  it('rejects unknown and expired tokens', async () => {
    const { user } = await createUser({}, { verified: false });
    const token = tokenFrom(lastMailTo(user.email));
    // Issued 2 days ago, so the 24 h have run out
    await query(
      "UPDATE user_tokens SET created_at = created_at - INTERVAL '2 days', expires_at = expires_at - INTERVAL '2 days'"
    );

    expect((await api().post('/api/auth/verify-email').send({ token })).status).toBe(400);
    expect((await api().post('/api/auth/verify-email').send({ token: 'nope' })).status).toBe(400);
  });

  describe('resend', () => {
    it('sends a new link and invalidates the old one', async () => {
      const { user, token: accessToken } = await createUser({}, { verified: false });
      const oldToken = tokenFrom(lastMailTo(user.email));
      // Leave the cooldown behind
      await query("UPDATE user_tokens SET created_at = created_at - INTERVAL '2 minutes'");

      const res = await api().post('/api/auth/verify-email/resend').set(authHeader(accessToken));

      expect(res.status).toBe(200);
      const newToken = tokenFrom(lastMailTo(user.email));
      expect(newToken).not.toBe(oldToken);
      expect((await api().post('/api/auth/verify-email').send({ token: oldToken })).status).toBe(
        400
      );
      expect((await api().post('/api/auth/verify-email').send({ token: newToken })).status).toBe(
        200
      );
    });

    it('allows only one email per minute', async () => {
      const { token: accessToken } = await createUser({}, { verified: false });

      const res = await api().post('/api/auth/verify-email/resend').set(authHeader(accessToken));

      expect(res.status).toBe(429);
    });

    it('rejects an already verified user', async () => {
      const { token: accessToken } = await createUser();

      const res = await api().post('/api/auth/verify-email/resend').set(authHeader(accessToken));

      expect(res.status).toBe(400);
    });
  });

  it('blocks checkout until the email is verified', async () => {
    const admin = await createAdmin();
    const product = await createProduct(admin.token);
    const { user, token: accessToken } = await createUser({}, { verified: false });
    await api()
      .post('/api/cart/items')
      .set(authHeader(accessToken))
      .send({ productId: product.id, quantity: 1 });
    const checkout = () =>
      api().post('/api/orders').set(authHeader(accessToken)).send({ shippingAddress });

    const blocked = await checkout();
    await api()
      .post('/api/auth/verify-email')
      .send({ token: tokenFrom(lastMailTo(user.email)) });
    const allowed = await checkout();

    expect(blocked.status).toBe(403);
    expect(allowed.status).toBe(201);
  });
});

describe('Password reset', () => {
  const forgot = (email) => api().post('/api/auth/forgot-password').send({ email });
  const reset = (token, password) =>
    api().post('/api/auth/reset-password').send({ token, password });
  const login = (email, password) => api().post('/api/auth/login').send({ email, password });

  it('answers the same for unknown emails and sends nothing (no account enumeration)', async () => {
    const { user } = await createUser();
    outbox.length = 0;

    const known = await forgot(user.email);
    const unknown = await forgot('nobody@example.com');

    expect(unknown.status).toBe(known.status);
    expect(unknown.body).toEqual(known.body);
    expect(outbox).toHaveLength(1);
    expect(outbox[0].to).toBe(user.email);
  });

  it('sets the new password, ends all sessions and sends a notice', async () => {
    const { user, token: accessToken, password } = await createUser();
    await forgot(user.email);
    const token = tokenFrom(lastMailTo(user.email));

    const res = await reset(token, 'brand-new-password');

    expect(res.status).toBe(200);
    expect((await me(accessToken)).status).toBe(401);
    expect((await login(user.email, password)).status).toBe(401);
    expect((await login(user.email, 'brand-new-password')).status).toBe(200);
    expect(lastMailTo(user.email).subject).toMatch(/password was changed/i);
  });

  it('accepts a token only once', async () => {
    const { user } = await createUser();
    await forgot(user.email);
    const token = tokenFrom(lastMailTo(user.email));

    await reset(token, 'brand-new-password');
    const again = await reset(token, 'another-password');

    expect(again.status).toBe(400);
  });

  it('rejects a token older than one hour', async () => {
    const { user } = await createUser();
    await forgot(user.email);
    const token = tokenFrom(lastMailTo(user.email));
    await query(
      "UPDATE user_tokens SET created_at = created_at - INTERVAL '2 hours', expires_at = expires_at - INTERVAL '2 hours'"
    );

    expect((await reset(token, 'brand-new-password')).status).toBe(400);
  });

  it('does not accept a verification token as reset token', async () => {
    const { user } = await createUser({}, { verified: false });
    const verificationToken = tokenFrom(lastMailTo(user.email));

    expect((await reset(verificationToken, 'brand-new-password')).status).toBe(400);
  });

  it('marks the email as verified, because the link proved access to the mailbox', async () => {
    const { user } = await createUser({}, { verified: false });
    await forgot(user.email);

    await reset(tokenFrom(lastMailTo(user.email)), 'brand-new-password');

    const { rows } = await query('SELECT email_verified_at FROM users WHERE id = $1', [user.id]);
    expect(rows[0].email_verified_at).not.toBeNull();
  });

  it('silently sends at most one email per minute', async () => {
    const { user } = await createUser();
    outbox.length = 0;

    await forgot(user.email);
    const second = await forgot(user.email);

    expect(second.status).toBe(200);
    expect(outbox).toHaveLength(1);
  });
});

describe('PATCH /users/me/password', () => {
  const changePassword = (accessToken, body) =>
    api().patch('/api/users/me/password').set(authHeader(accessToken)).send(body);

  it('changes the password, keeps this session and ends the others', async () => {
    const { user, token: phoneToken, password } = await createUser();
    const laptop = (await api().post('/api/auth/login').send({ email: user.email, password })).body
      .data;

    const res = await changePassword(laptop.token, {
      currentPassword: password,
      newPassword: 'brand-new-password',
    });

    expect(res.status).toBe(200);
    expect((await me(laptop.token)).status).toBe(200);
    expect((await me(phoneToken)).status).toBe(401);
    expect(lastMailTo(user.email).subject).toMatch(/password was changed/i);
  });

  it('rejects a wrong current password with 400 and changes nothing', async () => {
    const { token, password } = await createUser();

    const res = await changePassword(token, {
      currentPassword: 'wrong-password',
      newPassword: 'brand-new-password',
    });

    expect(res.status).toBe(400);
    expect((await me(token)).status).toBe(200);
    expect(
      (await changePassword(token, { currentPassword: password, newPassword: password })).status
    ).toBe(400);
  });
});
