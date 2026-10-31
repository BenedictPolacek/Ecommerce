import { vi } from 'vitest';
import type { Cart } from '@/features/cart/types';

export interface MockResponse {
  status?: number;
  body?: unknown;
}

type Handler = MockResponse | (() => MockResponse | Promise<MockResponse>);

/**
 * Replaces global fetch with fixed responses per endpoint, keyed as "METHOD /path"
 * without the /api prefix, e.g. { 'GET /users/me': { body: { success: true, data } } }.
 * A key without query string also matches requests with one ("GET /products" matches
 * "/products?page=2"); an exact key with query string wins.
 * The shop page (home) and the cart badge are loaded by many flows, so an empty shop and an
 * empty cart are mocked by default; pass the same keys to override them.
 * Unknown requests fail loudly so tests never hit a real server.
 */
export function mockApi(handlers: Record<string, Handler>) {
  const allHandlers: Record<string, Handler> = { ...defaults, ...handlers };

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const key = `${init?.method ?? 'GET'} ${url.replace(/^\/api/, '')}`;
    const handler = allHandlers[key] ?? allHandlers[key.split('?')[0]];
    if (!handler) throw new Error(`Unhandled request: ${key}`);

    const { status = 200, body } = typeof handler === 'function' ? await handler() : handler;
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Response sequence: each call returns the next entry, the last one repeats */
export function sequence(...responses: MockResponse[]) {
  let call = 0;
  return () => responses[Math.min(call++, responses.length - 1)];
}

export const ok = (data?: unknown): MockResponse => ({ body: { success: true, data } });

export const fail = (status: number, message = 'Error'): MockResponse => ({
  status,
  body: { success: false, message },
});

export const emptyCart: Cart = {
  id: 'cart-1',
  userId: 'user-1',
  items: [],
  totalItems: 0,
  subtotalCents: 0,
  shippingFeeCents: 0,
  taxCents: 0,
  totalCents: 0,
  createdAt: '2026-10-01T10:00:00.000Z',
};

const defaults: Record<string, Handler> = {
  'GET /cart': ok({ cart: emptyCart }),
  'GET /categories': ok({ categories: [] }),
  'GET /products': ok({
    products: [],
    pagination: { page: 1, limit: 12, total: 0, totalPages: 0 },
  }),
};
