import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

// Use DATABASE_URL if available, otherwise use individual connection variables
const pool = config.db.connectionString
  ? new Pool({ connectionString: config.db.connectionString })
  : new Pool({
      host: config.db.host,
      port: config.db.port,
      database: config.db.database,
      user: config.db.user,
      password: config.db.password,
    });

// A lost idle connection is normal (database restart, hosted databases that scale to zero).
// The pool drops that client and opens a new one on demand, so the process keeps running.
pool.on('error', (err) => {
  console.error('Lost an idle PostgreSQL connection:', err.message);
});

/**
 * Helper function to run parameterized queries
 * @param {string} text - SQL query string
 * @param {Array} params - Array of query parameters
 */
export const query = (text, params) => pool.query(text, params);

export { pool };
export default pool;
