import { type QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  forgotPassword,
  getCurrentUser,
  login,
  logout,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
} from './api';

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

/**
 * The session ended: mark the user as logged out and drop every other cached query
 * (cart, orders, ...) of the previous user. The auth query is kept and set to null instead
 * of being removed, so components already showing the user (e.g. the header) update at once.
 */
function endSession(queryClient: QueryClient) {
  queryClient.setQueryData(authKeys.me, null);
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== authKeys.me[0] });
}

/**
 * Leaving on purpose (logout, deleted account): go to the shop first, then end the session.
 * In the other order the protected page still on screen would see "no user" and
 * RequireAuth would send it to /login?redirect=... instead.
 * flushSync: React Router normally renders the new page in a transition (later), while
 * the user update renders at once. This way the shop is on screen before we continue.
 * That only works for a page that is not lazy loaded, so the target is always the shop.
 */
export function useLeaveSession() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return async () => {
    await navigate('/', { flushSync: true });
    endSession(queryClient);
  };
}

/** The caller ends the session afterwards with useLeaveSession (also if the request failed) */
export const useLogout = () => useMutation({ mutationFn: logout });

export function useVerifyEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: verifyEmail,
    // If this browser is logged in, email_verified_at changed: hides the banner
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authKeys.me }),
  });
}

export const useResendVerification = () => useMutation({ mutationFn: resendVerification });

export const useForgotPassword = () => useMutation({ mutationFn: forgotPassword });

export function useResetPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resetPassword,
    // The server ended all sessions of this user, including one in this browser
    onSuccess: () => endSession(queryClient),
  });
}
