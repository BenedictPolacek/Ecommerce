import { resetDatabase, closeDatabase, query } from './helpers/db.js';
import { api, authHeader, createUser } from './helpers/factories.js';

beforeEach(resetDatabase);
afterAll(closeDatabase);

describe('POST /api/auth/register', () => {
  const payload = {
    email: 'Jane@Example.com',
    password: 'password123',
    first_name: 'Jane',
    last_name: 'Doe',
  };

  it('creates the user, sets the auth cookie and never returns the password hash', async () => {
    const res = await api().post('/api/auth/register').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ email: 'jane@example.com', role: 'customer' });
    expect(res.body.data.user).not.toHaveProperty('password_hash');
    expect(res.headers['set-cookie'][0]).toMatch(/^token=.+HttpOnly/);
  });

  it('creates an empty cart in the same transaction', async () => {
    const res = await api().post('/api/auth/register').send(payload);

    const { rowCount } = await query('SELECT 1 FROM carts WHERE user_id = $1', [
      res.body.data.user.id,
    ]);
    expect(rowCount).toBe(1);
  });

  it('rejects a duplicate email with 409', async () => {
    await api().post('/api/auth/register').send(payload);
    const res = await api().post('/api/auth/register').send(payload);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/auth/login', () => {
  it('returns a token that works on protected routes', async () => {
    const { user, password } = await createUser();

    const login = await api().post('/api/auth/login').send({ email: user.email, password });
    expect(login.status).toBe(200);

    const me = await api().get('/api/users/me').set(authHeader(login.body.data.token));
    expect(me.status).toBe(200);
    expect(me.body.data.user.id).toBe(user.id);
  });

  it('rejects a wrong password with 401', async () => {
    const { user } = await createUser();

    const res = await api()
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password');
  });
});
