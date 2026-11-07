import pool from '../config/db.js';
import { config } from '../config/env.js';
import { ensureDatabaseExists, migrate } from './migrator.js';
import { seed } from './seeders/index.js';

// Usage: npm run db:reset
// Deletes EVERYTHING in the local database (all tables, users, orders), runs all
// migrations again and inserts the seed data. For development only: the seed never
// deletes or changes existing rows, so switching to new sample data needs a fresh start.
async function main() {
  if (config.isProduction) {
    console.error('Refusing to reset: NODE_ENV is "production".');
    process.exit(1);
  }
  // A hosted database (DATABASE_URL) is never local sample data
  if (config.db.connectionString) {
    console.error('Refusing to reset a database given by DATABASE_URL. Use PG* variables.');
    process.exit(1);
  }

  // A brand-new database (e.g. for the end-to-end tests) is created first
  await ensureDatabaseExists();
  const { rows } = await pool.query('SELECT current_database() AS name');
  console.log(`Resetting database "${rows[0].name}"...`);

  // Dropping the schema removes every table, sequence and the migration history at once
  await pool.query('DROP SCHEMA public CASCADE');
  await pool.query('CREATE SCHEMA public');

  const applied = await migrate();
  console.log(`Migrations applied:  ${applied.length}`);

  const inserted = await seed();
  console.log(`Categories inserted: ${inserted.categories}`);
  console.log(`Products inserted:   ${inserted.products}`);
  console.log(`Admin user created:  ${config.seed.adminEmail}`);
}

main()
  .catch((error) => {
    console.error('Reset failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
