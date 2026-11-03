/** A login on one device (GET /auth/sessions) */
export interface Session {
  id: string;
  user_agent: string | null;
  created_at: string;
  last_used_at: string;
  expires_at: string;
  /** The session of this browser */
  current: boolean;
}
