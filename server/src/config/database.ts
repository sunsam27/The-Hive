import knex from 'knex';

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
    directory: './src/db/migrations',
    extension: 'js',
  },
  seeds: {
    directory: './src/db/seeds',
    extension: 'js',
  },
});

export default db;
