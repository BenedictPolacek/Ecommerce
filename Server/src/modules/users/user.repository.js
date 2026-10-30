import pool from '../../config/db.js';

export const userRepository = {
  /**
   * Find user by email (includes password_hash for authentication)
   */
  async findByEmail(email) {
    const query = `
      SELECT id, email, password_hash, first_name, last_name, role, email_verified_at, created_at, updated_at
      FROM users
      WHERE email = $1
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
      WHERE id = $1
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
    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [id]);
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
};

export default userRepository;
