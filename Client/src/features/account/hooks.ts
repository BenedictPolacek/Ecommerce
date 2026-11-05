import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '@/features/auth/hooks';
import type { User } from '@/features/auth/types';
import {
  changePassword,
  deleteAccount,
  getSessions,
  logoutAll,
  revokeSession,
  updateProfile,
} from './api';

export const sessionKeys = {
  all: ['sessions'] as const,
};

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    // The header shows the first name: update the current user right away. Merged, not
    // replaced: the response only has the profile fields (e.g. no has_password)
    onSuccess: (user) =>
      queryClient.setQueryData<User | null>(authKeys.me, (current) =>
        current ? { ...current, ...user } : current
      ),
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: changePassword,
    // The server ended the other sessions: the device list is outdated
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
  });
}

export const useSessions = () => useQuery({ queryKey: sessionKeys.all, queryFn: getSessions });

export function useRevokeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: revokeSession,
    // Also after an error: a 404 means the session already ended somewhere else
    onSettled: () => queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
  });
}

/** Both also end the session in this browser: the caller leaves with useLeaveSession */
export const useLogoutAll = () => useMutation({ mutationFn: logoutAll });

export const useDeleteAccount = () => useMutation({ mutationFn: deleteAccount });
