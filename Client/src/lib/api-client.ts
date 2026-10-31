/**
 * Thin fetch wrapper for the REST API.
 *
 * - Always calls the same origin (/api), so the httpOnly auth cookies are sent automatically.
 * - Unwraps `{ success: true, data }` and throws an ApiError for `{ success: false, message }`.
 * - On 401 it refreshes the session once and retries the request.
 */

const API_BASE = '/api';

// Auth endpoints never trigger a refresh: a 401 there is the real answer
const NO_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly errors?: FieldError[];

  constructor(message: string, status: number, errors?: FieldError[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

const send = (path: string, { body, headers, ...init }: RequestOptions) =>
  fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined && { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

// Refresh tokens are single use and reuse revokes the whole session. Parallel 401s must
// therefore share one refresh request instead of each sending their own.
let refreshPromise: Promise<boolean> | null = null;

const refreshSession = () => {
  refreshPromise ??= send('/auth/refresh', { method: 'POST' })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
};

const parseBody = async (res: Response): Promise<unknown> => {
  if (res.status === 204) return undefined;
  const text = await res.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await send(path, options);

  if (res.status === 401 && !NO_REFRESH_PATHS.includes(path) && (await refreshSession())) {
    res = await send(path, options);
  }

  const json = (await parseBody(res)) as
    { data?: T; message?: string; errors?: FieldError[] } | undefined;

  if (!res.ok) {
    throw new ApiError(json?.message ?? `Request failed (${res.status})`, res.status, json?.errors);
  }

  return json?.data as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: 'DELETE', body }),
};
