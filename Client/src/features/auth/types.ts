export type UserRole = 'customer' | 'admin';

/** User as returned by the API (GET /users/me) */
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}
