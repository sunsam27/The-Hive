async function columnExists(knex, tableName, columnName) {
  const rows = await knex
    .select(knex.raw('1'))
    .from('information_schema.columns')
    .where({ table_name: tableName, column_name: columnName })
    .limit(1);
  return rows.length > 0;
}

export async function up(knex) {
  await knex.raw(
    "ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider varchar(32) NOT NULL DEFAULT 'flutterwave'"
  );
  await knex.raw('ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_ref varchar(100)');
  await knex.raw(
    'ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_transaction_id varchar(100)'
  );
  await knex.raw('ALTER TABLE payments ADD COLUMN IF NOT EXISTS checkout_url text');

  // The legacy reference column may already be gone if a previous run applied the
  // DDL but died before being recorded, so branch on what is actually present.
  const hasLegacyRef = await columnExists(knex, 'payments', 'flutterwave_tx_ref');
  if (hasLegacyRef) {
    await knex.raw(
      'UPDATE payments SET provider_ref = COALESCE(flutterwave_tx_ref, id::text) WHERE provider_ref IS NULL'
    );
  } else {
    await knex.raw('UPDATE payments SET provider_ref = id::text WHERE provider_ref IS NULL');
  }

  await knex.raw('ALTER TABLE payments ALTER COLUMN provider_ref SET NOT NULL');
  await knex.raw(
    'CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_ref_unique ON payments (provider_ref)'
  );

  if (hasLegacyRef) {
    await knex.raw('ALTER TABLE payments DROP COLUMN IF EXISTS flutterwave_tx_ref');
    await knex.raw('ALTER TABLE payments DROP COLUMN IF EXISTS flutterwave_transaction_id');
  }

  await knex.raw('ALTER TABLE payments ALTER COLUMN amount TYPE decimal(14, 2)');
}

export async function down(knex) {
  await knex.raw('ALTER TABLE payments ADD COLUMN IF NOT EXISTS flutterwave_tx_ref varchar(100)');
  await knex.raw(
    'ALTER TABLE payments ADD COLUMN IF NOT EXISTS flutterwave_transaction_id varchar(100)'
  );
  await knex.raw(
    'UPDATE payments SET flutterwave_tx_ref = COALESCE(provider_ref, id::text) WHERE flutterwave_tx_ref IS NULL'
  );
  await knex.raw(
    'UPDATE payments SET flutterwave_transaction_id = provider_transaction_id WHERE flutterwave_transaction_id IS NULL'
  );
  await knex.raw('ALTER TABLE payments ALTER COLUMN flutterwave_tx_ref SET NOT NULL');
  await knex.raw(
    'CREATE UNIQUE INDEX IF NOT EXISTS payments_flutterwave_tx_ref_unique ON payments (flutterwave_tx_ref)'
  );
  await knex.raw('ALTER TABLE payments DROP COLUMN IF EXISTS provider');
  await knex.raw('ALTER TABLE payments DROP COLUMN IF EXISTS provider_ref');
  await knex.raw('ALTER TABLE payments DROP COLUMN IF EXISTS provider_transaction_id');
  await knex.raw('ALTER TABLE payments DROP COLUMN IF EXISTS checkout_url');
}
