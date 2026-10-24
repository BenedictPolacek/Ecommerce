import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { runner } from 'node-pg-migrate';
import { config } from '../config/env.js';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Usage: node src/db/migrate.js [up|down] [count]
// up runs all pending migrations, down rolls back the last one by default
const direction = process.argv[2] || 'up';
const count = process.argv[3] ? parseInt(process.argv[3], 10) : direction === 'down' ? 1 : Infinity;

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

async function main() {
  if (!['up', 'down'].includes(direction) || Number.isNaN(count)) {
    console.error('Usage: node src/db/migrate.js [up|down] [count]');
    process.exit(1);
  }

  await ensureDatabaseExists();

  const applied = await runner({
    databaseUrl: connection,
    dir: path.join(__dirname, 'migrations'),
    direction,
    count,
    migrationsTable: 'pgmigrations',
    log: () => {},
  });

  if (applied.length === 0) {
    console.log('No migrations to run.');
  } else {
    applied.forEach((m) =>
      console.log(`${direction === 'up' ? 'Applied' : 'Reverted'}: ${m.name}`)
    );
  }
}

main().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});
