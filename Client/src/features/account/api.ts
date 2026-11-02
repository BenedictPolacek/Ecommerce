import type { User } from '@/features/auth/types';
import { api } from '@/lib/api-client';
import type { ProfileInput } from './schemas';

export const updateProfile = (input: ProfileInput) =>
  api.patch<{ user: User }>('/users/me', input).then(({ user }) => user);

/** Ends all other sessions of the user; this device stays logged in */
export const changePassword = (input: { currentPassword: string; newPassword: string }) =>
  api.patch<void>('/users/me/password', input);
