import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { authKeys } from '@/features/auth/hooks';
import { ApiError } from '@/lib/api-client';
import { isWakingError, WAKE_RETRY_LIMIT, wakeRetryDelay } from '@/lib/api-waking';

export function createQueryClient() {
  // A 401 that survived the refresh means the session is gone: treat the user as logged out
  const handleError = (error: Error) => {
    if (error instanceof ApiError && error.status === 401) {
      queryClient.setQueryData(authKeys.me, null);
    }
  };

  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: handleError }),
    mutationCache: new MutationCache({ onError: handleError }),
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        // A sleeping API (free hosting) needs up to a minute: keep trying for that long.
        // Only reads retry; mutations never do (an order must not be placed twice).
        retry: (failureCount, error) => {
          if (isWakingError(error)) return failureCount < WAKE_RETRY_LIMIT;
          // Client errors (4xx) will not fix themselves
          return !(error instanceof ApiError && error.status < 500) && failureCount < 2;
        },
        retryDelay: wakeRetryDelay,
      },
    },
  });

  return queryClient;
}
