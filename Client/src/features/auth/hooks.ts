import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser, logout } from './api';

export const authKeys = {
  me: ['auth', 'me'] as const,
};

/** The logged-in user (null = visitor). Single source of truth for the auth state. */
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: getCurrentUser,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      // Drop all cached data of the previous user (cart, orders, ...), even if the request failed
      queryClient.clear();
      queryClient.setQueryData(authKeys.me, null);
    },
  });
}
