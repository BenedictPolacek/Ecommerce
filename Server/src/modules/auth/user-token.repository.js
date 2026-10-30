import pool from '../../config/db.js';

export const userTokenRepository = {
  /**
   * Stores a new token and drops the user's older unused ones of the same purpose,
   * so only the link from the latest email works.
   * @param {import('pg').PoolClient} [client] - Optional transaction client
   */
  async replace({ userId, purpose, tokenHash, expiresAt }, client = pool) {
    await client.query(
      'DELETE FROM user_tokens WHERE user_id = $1 AND purpose = $2 AND used_at IS NULL',
      [userId, purpose]
    );
    await client.query(
      `INSERT INTO user_tokens (user_id, purpose, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [userId, purpose, tokenHash, expiresAt]
    );
  },

  /**
   * Resend cooldown: was a token for this purpose issued in the last `seconds`?
   * Compared in SQL, so the app server's clock does not matter.
   */
  async issuedWithin(userId, purpose, seconds) {
    const { rowCount } = await pool.query(
      `SELECT 1 FROM user_tokens
       WHERE user_id = $1 AND purpose = $2
         AND created_at > CURRENT_TIMESTAMP - make_interval(secs => $3)
       LIMIT 1`,
      [userId, purpose, seconds]
    );
    return rowCount > 0;
  },

  /**
   * Uses up a valid token in one atomic statement: of two concurrent requests with the
   * same token only one gets the row back. Returns the user id, or null if the token is
   * unknown, already used or expired.
   * @param {import('pg').PoolClient} client - Transaction client
   */
  async consume(client, { tokenHash, purpose }) {
    const { rows } = await client.query(
      `UPDATE user_tokens SET used_at = CURRENT_TIMESTAMP
       WHERE token_hash = $1 AND purpose = $2
         AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP
       RETURNING user_id`,
      [tokenHash, purpose]
    );
    return rows[0]?.user_id ?? null;
  },
};

export default userTokenRepository;
