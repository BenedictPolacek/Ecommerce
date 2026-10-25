import pool from '../config/db.js';
import { config } from '../config/env.js';
import { seed } from './seeders/index.js';

// Usage: node src/db/seed.js (run db:migrate first)
async function main() {
  // Sample data and a known admin password must never end up in production
  if (config.isProduction) {
    console.error('Refusing to seed: NODE_ENV is "production".');
    process.exit(1);
  }

  const inserted = await seed();

  console.log(`Categories inserted: ${inserted.categories}`);
  console.log(`Products inserted:   ${inserted.products}`);
  console.log(
    inserted.admin
      ? `Admin user created:  ${config.seed.adminEmail}`
      : `Admin user exists:   ${config.seed.adminEmail} (unchanged)`
  );
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
