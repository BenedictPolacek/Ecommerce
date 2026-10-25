import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { runner } from 'node-pg-migrate';
import { config } from '../config/env.js';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const connection = config.db.connectionString || {
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,
};

// Hosted databases (DATABASE_URL) are provisioned by the provider, so only create locally
async function ensureDatabaseExists() {
  if (config.db.connectionString) return;

  const client = new Client({ ...connection, database: 'postgres' });
  await client.connect();

  try {
    const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      config.db.database,
    ]);

    if (rowCount === 0) {
      // Identifiers cannot be parameterized; the name comes from our own env, not user input
      await client.query(`CREATE DATABASE "${config.db.database}"`);
      console.log(`Database "${config.db.database}" created.`);
    }
  } finally {
    await client.end();
  }
}

/**
 * Creates the database if missing and runs migrations.
 * Shared by the CLI (src/db/migrate.js) and the integration test setup.
 * @returns {Promise<Array<{ name: string }>>} the migrations that were applied or reverted
 */
export async function migrate({ direction = 'up', count = Infinity } = {}) {
  await ensureDatabaseExists();

  return runner({
    databaseUrl: connection,
    dir: path.join(__dirname, 'migrations'),
    direction,
    count,
    migrationsTable: 'pgmigrations',
    log: () => {},
  });
}
