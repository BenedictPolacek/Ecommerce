import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createQueryClient } from '@/app/query-client';
import { ApiError, api, NetworkError } from '@/lib/api-client';
import { fail, mockApi, ok, sequence } from '@/test/mock-api';
import { renderRoute } from '@/test/render';
import { isWakingError, WAKE_RETRY_LIMIT, wakeRetryDelay } from './api-waking';

const visitor = { 'GET /users/me': fail(401), 'POST /auth/refresh': fail(401) };

describe('isWakingError', () => {
  it('recognizes gateway errors and missing responses', () => {
    expect(isWakingError(new ApiError('Bad gateway', 502))).toBe(true);
    expect(isWakingError(new ApiError('Unavailable', 503))).toBe(true);
    expect(isWakingError(new ApiError('Timeout', 504))).toBe(true);
    expect(isWakingError(new NetworkError())).toBe(true);
  });

  it('leaves real errors alone', () => {
    expect(isWakingError(new ApiError('Bug', 500))).toBe(false);
    expect(isWakingError(new ApiError('Not found', 404))).toBe(false);
    expect(isWakingError(new Error('Unhandled request'))).toBe(false);
  });
});

describe('retry policy for reads', () => {
  const retry = createQueryClient().getDefaultOptions().queries!.retry as (
    failureCount: number,
    error: Error
  ) => boolean;

  it('keeps trying for about a minute while the API wakes up', () => {
    const waking = new ApiError('Bad gateway', 502);
    expect(retry(WAKE_RETRY_LIMIT - 1, waking)).toBe(true);
    expect(retry(WAKE_RETRY_LIMIT, waking)).toBe(false);

    const totalWait = Array.from({ length: WAKE_RETRY_LIMIT }, (_, i) => wakeRetryDelay(i)).reduce(
      (sum, ms) => sum + ms
    );
    expect(totalWait).toBeGreaterThanOrEqual(60_000);
    expect(totalWait).toBeLessThanOrEqual(90_000);
  });

  it('retries other server errors twice and client errors never', () => {
    expect(retry(1, new ApiError('Bug', 500))).toBe(true);
    expect(retry(2, new ApiError('Bug', 500))).toBe(false);
    expect(retry(0, new ApiError('Not found', 404))).toBe(false);
  });
});

describe('api client', () => {
  it('turns a failed connection into a NetworkError', async () => {
    mockApi({ 'GET /products': () => Promise.reject(new TypeError('Failed to fetch')) });

    await expect(api.get('/products')).rejects.toBeInstanceOf(NetworkError);
  });
});

describe('waking up notice', () => {
  it('explains the wait and loads the shop once the API answers', async () => {
    mockApi({
      ...visitor,
      'GET /categories': sequence(fail(503), ok({ categories: [] })),
    });
    renderRoute('/');

    expect(await screen.findByText(/waking up the shop/i)).toBeInTheDocument();

    // The retry after one second succeeds: the notice goes away by itself
    expect(await screen.findByRole('heading', { name: 'All products' })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/waking up the shop/i)).not.toBeInTheDocument());
  });

  it('stays hidden when the API answers right away', async () => {
    mockApi(visitor);
    renderRoute('/');

    expect(await screen.findByRole('heading', { name: 'All products' })).toBeInTheDocument();
    expect(screen.queryByText(/waking up the shop/i)).not.toBeInTheDocument();
  });
});
