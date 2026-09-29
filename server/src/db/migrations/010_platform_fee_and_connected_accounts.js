export function up(knex) {
  return knex
    .raw('ALTER TABLE payments ADD COLUMN IF NOT EXISTS gross_amount decimal(14, 2)')
    .then(() => knex.raw('ALTER TABLE payments ADD COLUMN IF NOT EXISTS platform_fee decimal(14, 2)'))
    .then(() =>
      knex.raw(
        'UPDATE payments SET gross_amount = amount WHERE gross_amount IS NULL'
      )
    )
    .then(() =>
      knex.raw('UPDATE payments SET platform_fee = 0 WHERE platform_fee IS NULL')
    )
    .then(() => knex.raw('ALTER TABLE payments ALTER COLUMN gross_amount SET NOT NULL'))
    .then(() => knex.raw('ALTER TABLE payments ALTER COLUMN platform_fee SET NOT NULL'))
    .then(() =>
      knex.raw('ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_account_id varchar(255)')
    );
}

export function down(knex) {
  return knex
    .raw('ALTER TABLE users DROP COLUMN IF EXISTS provider_account_id')
    .then(() => knex.raw('ALTER TABLE payments DROP COLUMN IF EXISTS gross_amount'))
    .then(() => knex.raw('ALTER TABLE payments DROP COLUMN IF EXISTS platform_fee'));
}
