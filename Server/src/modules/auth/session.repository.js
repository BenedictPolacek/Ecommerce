import pool from '../../config/db.js';

// Active = neither revoked nor run out
const ACTIVE = 'revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP';

export const sessionRepository = {
  /**
   * @param {import('pg').PoolClient} client - Transaction client
   */
  create: async (client, { userId, userAgent, expiresAt }) => {
    const { rows } = await client.query(
      `INSERT INTO sessions (user_id, user_agent, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, userAgent, expiresAt]
    );
    return rows[0];
  },

  /**
   * @param {import('pg').PoolClient} client - Transaction client
   */
  insertRefreshToken: async (client, { sessionId, tokenHash }) => {
    await client.query('INSERT INTO refresh_tokens (session_id, token_hash) VALUES ($1, $2)', [
      sessionId,
      tokenHash,
    ]);
  },

  /**
   * Refresh token with its session, both rows locked until the transaction ends,
   * so two requests with the same token are handled one after the other.
   * @param {import('pg').PoolClient} client - Transaction client
   */
  lockRefreshToken: async (client, tokenHash) => {
    const { rows } = await client.query(
      `SELECT rt.id, rt.used_at, s.id AS session_id, s.user_id,
              s.revoked_at, s.expires_at <= CURRENT_TIMESTAMP AS is_expired
       FROM refresh_tokens rt
       JOIN sessions s ON s.id = rt.session_id
       WHERE rt.token_hash = $1
       FOR UPDATE OF rt, s`,
      [tokenHash]
    );
    return rows[0] || null;
  },

  findSessionIdByTokenHash: async (tokenHash) => {
    const { rows } = await pool.query(
      'SELECT session_id FROM refresh_tokens WHERE token_hash = $1',
      [tokenHash]
    );
    return rows[0]?.session_id ?? null;
  },

  /**
   * @param {import('pg').PoolClient} client - Transaction client
   */
  markRefreshTokenUsed: async (client, refreshTokenId) => {
    await client.query('UPDATE refresh_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1', [
      refreshTokenId,
    ]);
  },

  /**
   * Sliding expiry: an active session lives on as long as it keeps refreshing
   * @param {import('pg').PoolClient} client - Transaction client
   */
  extend: async (client, sessionId, expiresAt) => {
    await client.query(
      'UPDATE sessions SET last_used_at = CURRENT_TIMESTAMP, expires_at = $2 WHERE id = $1',
      [sessionId, expiresAt]
    );
  },

  /**
   * Called on every authenticated request, so it must stay a cheap primary key lookup
   */
  isActive: async (sessionId, userId) => {
    const { rowCount } = await pool.query(
      `SELECT 1 FROM sessions WHERE id = $1 AND user_id = $2 AND ${ACTIVE}`,
      [sessionId, userId]
    );
    return rowCount > 0;
  },

  findActiveByUser: async (userId) => {
    const { rows } = await pool.query(
      `SELECT id, user_agent, created_at, last_used_at, expires_at
       FROM sessions
       WHERE user_id = $1 AND ${ACTIVE}
       ORDER BY last_used_at DESC`,
      [userId]
    );
    return rows;
  },

  /**
   * Revokes one session; with userId only if it belongs to that user.
   * Returns false if there was no active session to revoke.
   * @param {import('pg').PoolClient} [client] - Optional transaction client
   */
  revoke: async ({ sessionId, userId, reason }, client) => {
    const db = client || pool;
    const { rowCount } = await db.query(
      `UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP, revoked_reason = $2
       WHERE id = $1 AND ($3::uuid IS NULL OR user_id = $3) AND ${ACTIVE}`,
      [sessionId, reason, userId ?? null]
    );
    return rowCount > 0;
  },

  revokeAllForUser: async (userId, reason) => {
    const { rowCount } = await pool.query(
      `UPDATE sessions SET revoked_at = CURRENT_TIMESTAMP, revoked_reason = $2
       WHERE user_id = $1 AND ${ACTIVE}`,
      [userId, reason]
    );
    return rowCount;
  },

  /**
   * Housekeeping on login: revoked and expired sessions are of no use anymore.
   * Their refresh tokens go with them (ON DELETE CASCADE).
   */
  deleteInactiveForUser: async (userId) => {
    await pool.query(
      `DELETE FROM sessions
       WHERE user_id = $1 AND (revoked_at IS NOT NULL OR expires_at <= CURRENT_TIMESTAMP)`,
      [userId]
    );
  },
};

export default sessionRepository;
