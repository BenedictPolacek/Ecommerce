import { describe, expect, it } from 'vitest';
import { fail, mockApi, ok, sequence } from '@/test/mock-api';
import { api, ApiError } from './api-client';

const calls = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls.map(([url, init]) => `${init?.method} ${url}`);

describe('api client', () => {
  it('unwraps the data of a successful response', async () => {
    mockApi({ 'GET /products': ok({ products: [] }) });

    await expect(api.get('/products')).resolves.toEqual({ products: [] });
  });

  it('sends the body as JSON with the session cookies', async () => {
    const fetchMock = mockApi({ 'POST /cart/items': ok() });

    await api.post('/cart/items', { productId: 'p1', quantity: 2 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/cart/items');
    expect(init).toMatchObject({
      method: 'POST',
      credentials: 'same-origin',
      body: JSON.stringify({ productId: 'p1', quantity: 2 }),
    });
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('throws an ApiError with status, message and field errors', async () => {
    const errors = [{ field: 'email', message: 'Invalid email' }];
    mockApi({
      'POST /auth/register': {
        status: 400,
        body: { success: false, message: 'Validation failed', errors },
      },
    });

    const error = await api.post('/auth/register', {}).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, message: 'Validation failed', errors });
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    mockApi({ 'GET /products': () => ({ status: 502 }) });

    await expect(api.get('/products')).rejects.toMatchObject({
      status: 502,
      message: 'Request failed (502)',
    });
  });

  it('refreshes the session on 401 and retries the request once', async () => {
    const fetchMock = mockApi({
      'GET /users/me': sequence(fail(401), ok({ user: { id: '1' } })),
      'POST /auth/refresh': ok(),
    });

    await expect(api.get('/users/me')).resolves.toEqual({ user: { id: '1' } });
    expect(calls(fetchMock)).toEqual([
      'GET /api/users/me',
      'POST /api/auth/refresh',
      'GET /api/users/me',
    ]);
  });

  it('gives up with the 401 when the refresh fails', async () => {
    const fetchMock = mockApi({
      'GET /users/me': fail(401, 'Not logged in'),
      'POST /auth/refresh': fail(401),
    });

    await expect(api.get('/users/me')).rejects.toMatchObject({ status: 401 });
    expect(calls(fetchMock)).toEqual(['GET /api/users/me', 'POST /api/auth/refresh']);
  });

  it('shares one refresh between parallel requests (refresh tokens are single use)', async () => {
    const fetchMock = mockApi({
      'GET /cart': sequence(fail(401), ok({ items: [] })),
      'GET /orders': sequence(fail(401), ok({ orders: [] })),
      // Slow refresh, so both 401s arrive while it is still running
      'POST /auth/refresh': () => new Promise((resolve) => setTimeout(() => resolve(ok()), 20)),
    });

    await Promise.all([api.get('/cart'), api.get('/orders')]);

    expect(calls(fetchMock).filter((call) => call === 'POST /api/auth/refresh')).toHaveLength(1);
  });

  it('does not refresh when the login itself fails', async () => {
    const fetchMock = mockApi({ 'POST /auth/login': fail(401, 'Invalid email or password') });

    await expect(api.post('/auth/login', {})).rejects.toMatchObject({ status: 401 });
    expect(calls(fetchMock)).toEqual(['POST /api/auth/login']);
  });
});
