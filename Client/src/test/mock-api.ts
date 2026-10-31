import { vi } from 'vitest';

export interface MockResponse {
  status?: number;
  body?: unknown;
}

type Handler = MockResponse | (() => MockResponse | Promise<MockResponse>);

/**
 * Replaces global fetch with fixed responses per endpoint, keyed as "METHOD /path"
 * without the /api prefix, e.g. { 'GET /users/me': { body: { success: true, data } } }.
 * Unknown requests fail loudly so tests never hit a real server.
 */
export function mockApi(handlers: Record<string, Handler>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const key = `${init?.method ?? 'GET'} ${url.replace(/^\/api/, '')}`;
    const handler = handlers[key];
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
