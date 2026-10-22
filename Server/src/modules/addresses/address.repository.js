import pool from '../../config/db.js';

export const addressRepository = {
  /**
   * Find all addresses for a specific user
   */
  async findByUserId(userId) {
    const query = `
      SELECT id, user_id, address_line1, address_line2, city, state, postal_code, country, is_default, created_at, updated_at
      FROM addresses
      WHERE user_id = $1
      ORDER BY is_default DESC, created_at DESC
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  },

  /**
   * Find address by ID and user ID
   */
  async findUserAddress(id, userId) {
    const query = `
      SELECT id, user_id, address_line1, address_line2, city, state, postal_code, country, is_default, created_at, updated_at
      FROM addresses
      WHERE id = $1 AND user_id = $2
    `;
    const { rows } = await pool.query(query, [id, userId]);
    return rows[0] || null;
  },

  /**
   * Clear is_default flag for all addresses of a user
   */
  async clearDefault(userId, client = pool) {
    await client.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [userId]);
  },

  /**
   * Create an address
   */
  async create(userId, { address_line1, address_line2, city, state, postal_code, country, is_default = false }) {
    const query = `
      INSERT INTO addresses (user_id, address_line1, address_line2, city, state, postal_code, country, is_default)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      userId,
      address_line1.trim(),
      address_line2 ? address_line2.trim() : null,
      city.trim(),
      state ? state.trim() : null,
      postal_code.trim(),
      country.toUpperCase().trim(),
      is_default,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  /**
   * Update address fields
   */
  async update(id, userId, { address_line1, address_line2, city, state, postal_code, country, is_default }) {
    const query = `
      UPDATE addresses
      SET
        address_line1 = COALESCE($1, address_line1),
        address_line2 = COALESCE($2, address_line2),
        city          = COALESCE($3, city),
        state         = COALESCE($4, state),
        postal_code   = COALESCE($5, postal_code),
        country       = COALESCE($6, country),
        is_default    = COALESCE($7, is_default)
      WHERE id = $8 AND user_id = $9
      RETURNING *
    `;
    const values = [
      address_line1 !== undefined ? address_line1.trim() : null,
      address_line2 !== undefined ? (address_line2 ? address_line2.trim() : null) : null,
      city !== undefined ? city.trim() : null,
      state !== undefined ? (state ? state.trim() : null) : null,
      postal_code !== undefined ? postal_code.trim() : null,
      country !== undefined ? country.toUpperCase().trim() : null,
      is_default !== undefined ? is_default : null,
      id,
      userId,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0] || null;
  },

  /**
   * Delete address
   */
  async delete(id, userId) {
    const query = 'DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id';
    const { rows } = await pool.query(query, [id, userId]);
    return rows[0] || null;
  },
};

export default addressRepository;
