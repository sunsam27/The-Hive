import path from 'node:path';
import { fileURLToPath } from 'node:url';
import knex from 'knex';

const migrationsDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', 'migrations');
const seedsDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', 'seeds');

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('supabase')
      ? { rejectUnauthorized: false }
      : false,
  },
  pool: { min: 0, max: 5 },
  migrations: {
    directory: migrationsDirectory,
    extension: 'js',
  },
  seeds: {
    directory: seedsDirectory,
    extension: 'js',
  },
});

export default db;
