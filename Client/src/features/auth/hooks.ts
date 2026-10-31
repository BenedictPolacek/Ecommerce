import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser, login, logout, register } from './api';

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

/**
 * After login/register the session cookies are set: reload the current user and wait for it,
 * so protected pages see the user right away when we navigate there.
 */
function useStartSession<TInput, TData>(mutationFn: (input: TInput) => Promise<TData>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.me, refetchType: 'all' }),
  });
}

export const useLogin = () => useStartSession(login);

export const useRegister = () => useStartSession(register);

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
