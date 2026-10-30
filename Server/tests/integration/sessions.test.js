import jwt from 'jsonwebtoken';
import { config } from '../../src/config/env.js';
import { resetDatabase, closeDatabase, query } from './helpers/db.js';
import { api, authHeader, createUser } from './helpers/factories.js';

beforeEach(resetDatabase);
afterAll(closeDatabase);

describe('Sessions and refresh tokens', () => {
  let user;
  let password;

  const login = (userAgent = 'jest-agent') =>
    api()
      .post('/api/auth/login')
      .set('User-Agent', userAgent)
      .send({ email: user.email, password })
      .then((res) => res.body.data);

  const refresh = (refreshToken) => api().post('/api/auth/refresh').send({ refreshToken });

  // Any route behind authenticate
  const me = (token) => api().get('/api/users/me').set(authHeader(token));

  beforeEach(async () => {
    ({ user, password } = await createUser());
  });

  it('login returns both tokens and sets both httpOnly cookies', async () => {
    const res = await api().post('/api/auth/login').send({ email: user.email, password });

    expect(res.body.data).toEqual(
      expect.objectContaining({ token: expect.any(String), refreshToken: expect.any(String) })
    );
    const cookies = res.headers['set-cookie'].join('\n');
    expect(cookies).toMatch(/token=.+HttpOnly/);
    // The refresh cookie is only sent to the auth endpoints
    expect(cookies).toMatch(/refresh_token=.+Path=\/api\/auth.+HttpOnly/);
  });

  it('stores only the hash of the refresh token', async () => {
    const { refreshToken } = await login();

    const { rows } = await query('SELECT token_hash FROM refresh_tokens');
    expect(rows.map((r) => r.token_hash)).not.toContain(refreshToken);
  });

  describe('POST /auth/refresh', () => {
    it('returns a new working token pair and rotates the refresh token', async () => {
      const first = await login();

      const res = await refresh(first.refreshToken);

      expect(res.status).toBe(200);
      expect(res.body.data.refreshToken).not.toBe(first.refreshToken);
      expect((await me(res.body.data.token)).status).toBe(200);
    });

    it('accepts the refresh token from the cookie', async () => {
      const { refreshToken } = await login();

      const res = await api()
        .post('/api/auth/refresh')
        .set('Cookie', `refresh_token=${refreshToken}`);

      expect(res.status).toBe(200);
    });

    it('detects reuse of a used refresh token and ends the whole session', async () => {
      const first = await login();
      const second = (await refresh(first.refreshToken)).body.data;

      // The stolen old token is used again
      const reuse = await refresh(first.refreshToken);

      expect(reuse.status).toBe(401);
      // Neither the newest refresh token nor the access token work anymore
      expect((await refresh(second.refreshToken)).status).toBe(401);
      expect((await me(second.token)).status).toBe(401);
      // createUser() started its own session too, so look up this one by id
      const { sid } = jwt.decode(first.token);
      const { rows } = await query('SELECT revoked_reason FROM sessions WHERE id = $1', [sid]);
      expect(rows[0].revoked_reason).toBe('reuse_detected');
    });

    it.each([
      ['an unknown token', { refreshToken: 'not-a-real-token' }],
      ['no token at all', {}],
    ])('rejects %s with 401', async (_, body) => {
      const res = await api().post('/api/auth/refresh').send(body);

      expect(res.status).toBe(401);
    });

    it('rejects a token of an expired session', async () => {
      const { refreshToken } = await login();
      await query("UPDATE sessions SET expires_at = NOW() - INTERVAL '1 minute'");

      expect((await refresh(refreshToken)).status).toBe(401);
    });
  });

  describe('logout', () => {
    it('ends the session immediately: access and refresh token stop working', async () => {
      const session = await login();

      const res = await api()
        .post('/api/auth/logout')
        .set(authHeader(session.token))
        .send({ refreshToken: session.refreshToken });

      expect(res.status).toBe(200);
      expect((await me(session.token)).status).toBe(401);
      expect((await refresh(session.refreshToken)).status).toBe(401);
    });

    it('only ends the current session, not other devices', async () => {
      const laptop = await login('laptop');
      const phone = await login('phone');

      await api().post('/api/auth/logout').set(authHeader(laptop.token));

      expect((await me(laptop.token)).status).toBe(401);
      expect((await me(phone.token)).status).toBe(200);
    });

    it('works with an expired access token', async () => {
      const session = await login();
      const { sid } = jwt.decode(session.token);
      const expired = jwt.sign({ id: user.id, email: user.email, sid }, config.jwt.secret, {
        expiresIn: -10,
      });

      await api().post('/api/auth/logout').set(authHeader(expired));

      expect((await me(session.token)).status).toBe(401);
    });

    it('succeeds without any token', async () => {
      const res = await api().post('/api/auth/logout');

      expect(res.status).toBe(200);
    });

    it('logout-all ends every session of the user', async () => {
      const laptop = await login('laptop');
      const phone = await login('phone');

      const res = await api().post('/api/auth/logout-all').set(authHeader(laptop.token));

      expect(res.status).toBe(200);
      expect((await me(laptop.token)).status).toBe(401);
      expect((await me(phone.token)).status).toBe(401);
    });
  });

  describe('session management', () => {
    it('lists active sessions with user agent and marks the current one', async () => {
      await login('phone');
      const laptop = await login('laptop');

      const res = await api().get('/api/auth/sessions').set(authHeader(laptop.token));

      expect(res.status).toBe(200);
      const agents = res.body.data.sessions.map((s) => [s.user_agent, s.current]);
      expect(agents).toEqual(
        expect.arrayContaining([
          ['laptop', true],
          ['phone', false],
        ])
      );
    });

    it('ends another of my sessions', async () => {
      const phone = await login('phone');
      const laptop = await login('laptop');
      const { sid } = jwt.decode(phone.token);

      const res = await api().delete(`/api/auth/sessions/${sid}`).set(authHeader(laptop.token));

      expect(res.status).toBe(200);
      expect((await me(phone.token)).status).toBe(401);
      expect((await me(laptop.token)).status).toBe(200);
    });

    it("returns 404 for someone else's session", async () => {
      const mine = await login();
      const other = await createUser();
      const { sid } = jwt.decode(other.token);

      const res = await api().delete(`/api/auth/sessions/${sid}`).set(authHeader(mine.token));

      expect(res.status).toBe(404);
      expect((await me(other.token)).status).toBe(200);
    });

    it('deletes revoked and expired sessions on the next login', async () => {
      const old = await login();
      await api().post('/api/auth/logout').set(authHeader(old.token));

      await login();

      const { rows } = await query('SELECT revoked_at FROM sessions WHERE user_id = $1', [user.id]);
      expect(rows.every((r) => r.revoked_at === null)).toBe(true);
    });
  });

  it('rejects access tokens without a session id (issued before sessions existed)', async () => {
    const legacy = jwt.sign({ id: user.id, email: user.email }, config.jwt.secret, {
      expiresIn: '15m',
    });

    expect((await me(legacy)).status).toBe(401);
  });
});
