import { config } from '../../src/config/env.js';
import { migrate } from '../../src/db/migrator.js';
import { assertTestDatabaseName } from './helpers/db.js';

// Brings the test database schema up to date once per test run
export default async function globalSetup() {
  const name = config.db.connectionString
    ? new URL(config.db.connectionString).pathname.slice(1)
    : config.db.database;
  assertTestDatabaseName(name);

  await migrate();
}
