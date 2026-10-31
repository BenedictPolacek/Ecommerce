import { api, ApiError } from '@/lib/api-client';
import type { User } from './types';

/** Returns the logged-in user, or null for visitors without a valid session */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const { user } = await api.get<{ user: User }>('/users/me');
    return user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

export const logout = () => api.post<void>('/auth/logout');
