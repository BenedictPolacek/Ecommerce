import pool from '../../config/db.js';

export const userRepository = {
  /**
   * Find user by email (includes password_hash for authentication)
   */
  async findByEmail(email) {
    const query = `
      SELECT id, email, password_hash, first_name, last_name, role, created_at, updated_at
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
      SELECT id, email, first_name, last_name, role, created_at, updated_at
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
      RETURNING id, email, first_name, last_name, role, created_at, updated_at
    `;
    const values = [email.toLowerCase().trim(), password_hash, first_name.trim(), last_name.trim(), role];
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
      RETURNING id, email, first_name, last_name, role, created_at, updated_at
    `;
    const values = [
      first_name ? first_name.trim() : null,
      last_name ? last_name.trim() : null,
      id,
    ];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  },
};

export default userRepository;
