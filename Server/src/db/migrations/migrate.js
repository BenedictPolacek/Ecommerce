import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { config } from '../../config/env.js';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function ensureDatabaseExists() {
  const client = new Client({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: 'postgres',
  });

  await client.connect();

  const checkDb = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [config.db.database]
  );

  if (checkDb.rowCount === 0) {
    console.log(` Database "${config.db.database}" does not exist. Creating it...`);
    await client.query(`CREATE DATABASE "${config.db.database}"`);
    console.log(` Database "${config.db.database}" created successfully.`);
  } else {
    console.log(` Database "${config.db.database}" already exists.`);
  }

  await client.end();
}

async function runMigration() {
  try {
    // 1. Ensure database exists
    await ensureDatabaseExists();

    // 2. Connect pool to the target database
    const { default: pool } = await import('../../config/db.js');

    const schemaPath = path.resolve(__dirname, '../../../drawSQL-pgsql-export-2026-08-16.sql');
    console.log('Reading schema SQL file from:', schemaPath);
    const sql = fs.readFileSync(schemaPath, 'utf-8');

    console.log(`Connecting to "${config.db.database}" and running migration...`);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log(' Migration completed successfully! All tables and triggers created.');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(' Migration failed:', error);
      process.exit(1);
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    console.error(' Migration setup error:', error);
    process.exit(1);
  }
}

runMigration();
