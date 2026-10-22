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

// Event listener to log unexpected errors on idle pool clients
pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
    process.exit(-1);
});

/**
 * Helper function to run parameterized queries
 * @param {string} text - SQL query string
 * @param {Array} params - Array of query parameters
 */
export const query = (text, params) => pool.query(text, params);

export { pool };
export default pool;
