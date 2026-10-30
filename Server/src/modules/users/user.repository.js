import pool from '../../config/db.js';

export const userRepository = {
  /**
   * Find user by email (includes password_hash for authentication)
   */
  async findByEmail(email) {
    const query = `
      SELECT id, email, password_hash, first_name, last_name, role, email_verified_at, created_at, updated_at
      FROM users
      WHERE email = $1 AND deleted_at IS NULL
    `;
    const result = await pool.query(query, [email.toLowerCase().trim()]);
    return result.rows[0] || null;
  },

  /**
   * Find user by ID (excludes password_hash)
   */
  async findById(id) {
    const query = `
      SELECT id, email, first_name, last_name, role, email_verified_at, created_at, updated_at
      FROM users
      WHERE id = $1 AND deleted_at IS NULL
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  },

  /**
   * Create a new user record
   * @param {Object} userData
   * @param {import('pg').PoolClient} [client] - Optional client for transaction support
   */
  async create({ email, password_hash, first_name, last_name, role = 'customer' }, client = pool) {
    const query = `
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, first_name, last_name, role, email_verified_at, created_at, updated_at
    `;
    const values = [
      email.toLowerCase().trim(),
      password_hash,
      first_name.trim(),
      last_name.trim(),
      role,
    ];
    const result = await client.query(query, values);
    return result.rows[0];
  },

  /**
   * Update profile fields for a user
   */
  async update(id, { first_name, last_name }) {
    const query = `
      UPDATE users
      SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name)
      WHERE id = $3
      RETURNING id, email, first_name, last_name, role, email_verified_at, created_at, updated_at
    `;
    const values = [first_name ? first_name.trim() : null, last_name ? last_name.trim() : null, id];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  },

  /**
   * Only for checking the current password (findById never returns the hash)
   */
  async findPasswordHashById(id) {
    const result = await pool.query(
      'SELECT password_hash FROM users WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    return result.rows[0]?.password_hash ?? null;
  },

  /**
   * Keeps the first verification time if the user was already verified
   * @param {import('pg').PoolClient} [client] - Optional client for transaction support
   */
  async markEmailVerified(id, client = pool) {
    await client.query(
      `UPDATE users SET email_verified_at = COALESCE(email_verified_at, CURRENT_TIMESTAMP)
       WHERE id = $1`,
      [id]
    );
  },

  /**
   * @param {import('pg').PoolClient} [client] - Optional client for transaction support
   */
  async updatePassword(id, passwordHash, client = pool) {
    const result = await client.query(
      `UPDATE users SET password_hash = $2
       WHERE id = $1
       RETURNING id, email, first_name, last_name, role, email_verified_at, created_at, updated_at`,
      [id, passwordHash]
    );
    return result.rows[0] || null;
  },

  // --- Account deletion (GDPR). All of these run inside the caller's transaction. ---

  /**
   * Locks the user row: a concurrent checkout (orders.user_id references it) waits
   * until the deletion is done.
   * @param {import('pg').PoolClient} client - Transaction client
   */
  async lockActive(client, id) {
    const { rows } = await client.query(
      `SELECT id, email, first_name, role FROM users
       WHERE id = $1 AND deleted_at IS NULL
       FOR UPDATE`,
      [id]
    );
    return rows[0] || null;
  },

  /**
   * Locks all other admins, so two admins deleting themselves at the same time
   * cannot both pass the "not the last admin" check.
   * @param {import('pg').PoolClient} client - Transaction client
   */
  async lockOtherAdmins(client, id) {
    const { rows } = await client.query(
      `SELECT id FROM users
       WHERE role = 'admin' AND deleted_at IS NULL AND id <> $1
       FOR UPDATE`,
      [id]
    );
    return rows.length;
  },

  /**
   * @param {import('pg').PoolClient} client - Transaction client
   */
  async countOrdersWithStatus(client, id, statuses) {
    const { rows } = await client.query(
      'SELECT COUNT(*)::int AS count FROM orders WHERE user_id = $1 AND status = ANY($2)',
      [id, statuses]
    );
    return rows[0].count;
  },

  /**
   * Rows that must be kept and reference the user (ON DELETE RESTRICT): orders and audit
   * entries. If there are any, the user is anonymized instead of deleted.
   * @param {import('pg').PoolClient} client - Transaction client
   */
  async hasRetainedRecords(client, id) {
    const { rows } = await client.query(
      `SELECT EXISTS (SELECT 1 FROM orders WHERE user_id = $1)
           OR EXISTS (SELECT 1 FROM stock_movements WHERE created_by = $1)
           OR EXISTS (SELECT 1 FROM order_status_history WHERE changed_by = $1)
           AS retained`,
      [id]
    );
    return rows[0].retained;
  },

  /**
   * Personal data with no retention duty: deleted right away.
   * (On a real DELETE of the user, ON DELETE CASCADE does the same.)
   * @param {import('pg').PoolClient} client - Transaction client
   */
  async deletePersonalData(client, id) {
    for (const table of ['addresses', 'carts', 'sessions', 'user_tokens']) {
      // Table names come from the fixed list above, never from user input
      await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [id]);
    }
  },

  /**
   * Removes everything that identifies the person and keeps the row for the orders.
   * '!' is no valid bcrypt hash, so no password can ever match it.
   * @param {import('pg').PoolClient} client - Transaction client
   */
  async anonymize(client, id) {
    await client.query(
      `UPDATE users
       SET email = 'deleted-' || id || '@deleted.invalid',
           first_name = 'Deleted',
           last_name = 'User',
           password_hash = '!',
           role = 'customer',
           email_verified_at = NULL,
           deleted_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );
  },

  /**
   * @param {import('pg').PoolClient} client - Transaction client
   */
  async hardDelete(client, id) {
    await client.query('DELETE FROM users WHERE id = $1', [id]);
  },
};

export default userRepository;
