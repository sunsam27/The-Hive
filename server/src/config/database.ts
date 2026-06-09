import knex from 'knex';

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: { min: 2, max: 10 },
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
