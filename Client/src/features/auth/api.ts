import { api, ApiError } from '@/lib/api-client';
import type { LoginInput, RegisterInput } from './schemas';
import type { User } from './types';

// The tokens in the response body are for non-browser clients; the browser uses the cookies
interface AuthResponse {
  user: User;
}

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

export const login = (input: LoginInput) => api.post<AuthResponse>('/auth/login', input);

export const register = (input: RegisterInput) => api.post<AuthResponse>('/auth/register', input);

export const logout = () => api.post<void>('/auth/logout');
