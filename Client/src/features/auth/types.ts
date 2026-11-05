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
  /** false: signs in only with Google/GitHub and can set a password via the reset email */
  has_password: boolean;
}

/** Sign-in providers the server has configured */
export type OAuthProvider = 'google' | 'github';
