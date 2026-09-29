export function up(knex) {
  return knex.schema
    .alterTable('payments', (table) => {
      table.decimal('gross_amount', 14, 2);
      table.decimal('platform_fee', 14, 2);
    })
    .then(() =>
      knex.raw('UPDATE payments SET gross_amount = amount, platform_fee = 0 WHERE gross_amount IS NULL')
    )
    .then(() => knex.raw('ALTER TABLE payments ALTER COLUMN gross_amount SET NOT NULL'))
    .then(() => knex.raw('ALTER TABLE payments ALTER COLUMN platform_fee SET NOT NULL'))
    .then(() =>
      knex.schema.alterTable('users', (table) => {
        table.string('provider_account_id', 255);
      })
    );
}

export function down(knex) {
  return knex.schema
    .alterTable('users', (table) => {
      table.dropColumn('provider_account_id');
    })
    .then(() =>
      knex.schema.alterTable('payments', (table) => {
        table.dropColumn('gross_amount');
        table.dropColumn('platform_fee');
      })
    );
}
