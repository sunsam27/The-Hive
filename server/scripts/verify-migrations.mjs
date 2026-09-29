import knexFactory from 'knex';

const ADMIN = process.env.ADMIN_DATABASE_URL;
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = process.env.MIGRATIONS_DIR || path.join(here, '..', 'src', 'db', 'migrations');

if (process.env.CONFIRM_DROP_DATABASES !== '1') {
  console.error('This script creates and DROPS scratch databases (finsyte_*).');
  console.error('Re-run with CONFIRM_DROP_DATABASES=1 to proceed.');
  process.exit(2);
}

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '\n        -> ' + detail : ''}`);
}

async function makeDb(name) {
  const admin = knexFactory({ client: 'pg', connection: ADMIN });
  await admin.raw(`DROP DATABASE IF EXISTS ${name}`);
  await admin.raw(`CREATE DATABASE ${name}`);
  await admin.destroy();
  const target = new URL(ADMIN);
  target.pathname = `/${name}`;
  return knexFactory({
    client: 'pg',
    connection: target.toString(),
    pool: { min: 0, max: 3 },
    migrations: { directory: MIGRATIONS, extension: 'js' },
  });
}

async function dropAll() {
  const admin = knexFactory({ client: 'pg', connection: ADMIN });
  for (const r of results.map((x) => x.db).filter(Boolean)) await admin.raw(`DROP DATABASE IF EXISTS ${r}`);
  await admin.destroy();
}

// Production reality: the DDL committed, then the process died before knex
// recorded the migration. The next cold start re-runs it against a database
// where every change is already in place. Each migration must tolerate that.
async function partial(name, forget) {
  const db = await makeDb(name);
  results.push({ db: name });
  try {
    await db.migrate.latest();
    await db.raw('DELETE FROM knex_migrations WHERE name = ?', [forget]);
    await db.migrate.latest();
    record(`${forget} re-runs on an already-migrated db`, true);
  } catch (e) {
    record(`${forget} re-runs on an already-migrated db`, false, e.message.split('\n')[0].slice(0, 150));
  } finally {
    await db.destroy();
  }
}

console.log('=== fresh chain (regression) ===');
{
  const db = await makeDb('finsyte_fresh');
  results.push({ db: 'finsyte_fresh' });
  try {
    await db.migrate.latest();
    const applied = await db('knex_migrations').select('name').orderBy('id');
    const cols = await db('information_schema.columns')
      .where({ table_name: 'payments' })
      .pluck('column_name');
    const has = (c) => cols.includes(c);
    const ok = applied.length === 12 && has('provider_session_id') && has('provider') && has('gross_amount');
    record(`fresh DB applies all 12 migrations`, ok, `${applied.length} applied`);
  } catch (e) {
    record('fresh DB applies all 11 migrations', false, e.message.split('\n')[0].slice(0, 160));
  } finally {
    await db.destroy();
  }
}

console.log('\n=== re-run on already-migrated db (unrecorded migration) ===');
await partial('finsyte_p009', '009_provider_neutral_payments.js');
await partial('finsyte_p010', '010_platform_fee_and_connected_accounts.js');
await partial('finsyte_p011', '011_create_payment_accounts.js');

console.log('\n=== down / up round trip ===');
{
  const db = await makeDb('finsyte_round');
  results.push({ db: 'finsyte_round' });
  try {
    await db.migrate.latest();
    await db.migrate.rollback(undefined, true);
    const left = await db('knex_migrations').count('* as c').first();
    await db.migrate.latest();
    const back = await db('knex_migrations').count('* as c').first();
    record('rollback then re-apply', Number(left.c) === 0 && Number(back.c) === 12, `after down=${left.c}, after up=${back.c}`);
  } catch (e) {
    record('rollback then re-apply', false, e.message.split('\n')[0].slice(0, 160));
  } finally {
    await db.destroy();
  }
}

await dropAll();
const failed = results.filter((r) => r.ok === false);
console.log(`\n${results.filter((r) => r.ok !== undefined).filter((r) => r.ok).length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);

