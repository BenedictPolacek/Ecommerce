import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { authKeys } from '@/features/auth/hooks';
import { ApiError } from '@/lib/api-client';

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
        // Client errors (4xx) will not fix themselves: only retry network and server errors
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) && failureCount < 2,
      },
    },
  });

  return queryClient;
}
