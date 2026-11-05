/** Accounts at Google / GitHub linked to a shop account (user_identities) */
export const identityRepository = {
  /**
   * The (not deleted) user linked to this provider account, or null
   * @param {import('pg').PoolClient} client - Transaction client
   */
  async findUser(client, provider, providerUserId) {
    const { rows } = await client.query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.email_verified_at,
              u.created_at, u.updated_at
       FROM user_identities i
       JOIN users u ON u.id = i.user_id
       WHERE i.provider = $1 AND i.provider_user_id = $2 AND u.deleted_at IS NULL`,
      [provider, providerUserId]
    );
    return rows[0] ?? null;
  },

  /**
   * @param {import('pg').PoolClient} client - Transaction client
   */
  async create(client, { userId, provider, providerUserId, email }) {
    await client.query(
      `INSERT INTO user_identities (user_id, provider, provider_user_id, email)
       VALUES ($1, $2, $3, $4)`,
      [userId, provider, providerUserId, email]
    );
  },

  /**
   * @param {import('pg').PoolClient} client - Transaction client
   */
  async touch(client, provider, providerUserId) {
    await client.query(
      `UPDATE user_identities SET last_used_at = CURRENT_TIMESTAMP
       WHERE provider = $1 AND provider_user_id = $2`,
      [provider, providerUserId]
    );
  },
};

export default identityRepository;
