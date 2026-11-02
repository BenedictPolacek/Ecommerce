import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authKeys } from '@/features/auth/hooks';
import { changePassword, updateProfile } from './api';

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    // The header shows the first name: update the current user right away
    onSuccess: (user) => queryClient.setQueryData(authKeys.me, user),
  });
}

export const useChangePassword = () => useMutation({ mutationFn: changePassword });
