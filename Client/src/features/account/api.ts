import type { User } from '@/features/auth/types';
import { api } from '@/lib/api-client';
import type { ProfileInput } from './schemas';
import type { Session } from './types';

export const updateProfile = (input: ProfileInput) =>
  api.patch<{ user: User }>('/users/me', input).then(({ user }) => user);

/** Ends all other sessions of the user; this device stays logged in */
export const changePassword = (input: { currentPassword: string; newPassword: string }) =>
  api.patch<void>('/users/me/password', input);

/** Active sessions, the most recently used first */
export const getSessions = () =>
  api.get<{ sessions: Session[] }>('/auth/sessions').then(({ sessions }) => sessions);

/** Logs one device out (e.g. a lost phone) */
export const revokeSession = (id: string) => api.delete<void>(`/auth/sessions/${id}`);

/** Ends every session, including this one; the server clears the cookies */
export const logoutAll = () => api.post<void>('/auth/logout-all');

/** Deletes (or anonymizes, if there are orders) the account and ends every session */
export const deleteAccount = (password: string) => api.delete<void>('/users/me', { password });
