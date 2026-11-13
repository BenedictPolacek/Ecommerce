import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { ApiError, NetworkError } from './api-client';

/**
 * On Render's free plan the API sleeps after 15 minutes without traffic and needs up to a
 * minute to start again. Meanwhile requests fail with a gateway error (502/503/504) or no
 * response at all. These errors fix themselves, so reads are retried for about a minute.
 */
const WAKING_STATUSES = new Set([502, 503, 504]);

export const isWakingError = (error: unknown) =>
  error instanceof NetworkError || (error instanceof ApiError && WAKING_STATUSES.has(error.status));

/** Attempts after the first one: 1 + 2 + 4 + 12 × 5 seconds ≈ 67 seconds of waiting */
export const WAKE_RETRY_LIMIT = 15;

/** 1 s, 2 s, 4 s, then every 5 s */
export const wakeRetryDelay = (failureCount: number) => Math.min(1000 * 2 ** failureCount, 5000);

/** A first load counts as slow after this long (the API may be starting without failing) */
const SLOW_FIRST_LOAD_MS = 4000;

/**
 * True while the shop waits for the API: a query is retrying after a waking error, or a
 * first load has taken more than a few seconds.
 */
export function useApiWaking() {
  const cache = useQueryClient().getQueryCache();
  const subscribe = useCallback((onChange: () => void) => cache.subscribe(onChange), [cache]);

  const retrying = useSyncExternalStore(subscribe, () =>
    cache
      .getAll()
      .some(
        (query) =>
          query.state.fetchStatus === 'fetching' && isWakingError(query.state.fetchFailureReason)
      )
  );
  const firstLoad = useSyncExternalStore(subscribe, () =>
    cache
      .getAll()
      .some((query) => query.state.fetchStatus === 'fetching' && query.state.status === 'pending')
  );

  const [slowFirstLoad, setSlowFirstLoad] = useState(false);
  useEffect(() => {
    if (!firstLoad) return;
    const timer = setTimeout(() => setSlowFirstLoad(true), SLOW_FIRST_LOAD_MS);
    return () => {
      clearTimeout(timer);
      setSlowFirstLoad(false);
    };
  }, [firstLoad]);

  return retrying || slowFirstLoad;
}
