export function up(knex) {
  return knex.schema
    .alterTable('payments', (table) => {
      table.string('provider', 32).notNullable().defaultTo('flutterwave');
      table.string('provider_ref', 100);
      table.string('provider_transaction_id', 100);
      table.text('checkout_url');
    })
    .then(() =>
      knex.raw(
        'UPDATE payments SET provider_ref = flutterwave_tx_ref, provider_transaction_id = flutterwave_transaction_id WHERE provider_ref IS NULL'
      )
    )
    .then(() => knex.raw('ALTER TABLE payments ALTER COLUMN provider_ref SET NOT NULL'))
    .then(() =>
      knex.raw('CREATE UNIQUE INDEX payments_provider_ref_unique ON payments (provider_ref)')
    )
    .then(() =>
      knex.schema.alterTable('payments', (table) => {
        table.dropColumn('flutterwave_tx_ref');
        table.dropColumn('flutterwave_transaction_id');
        table.decimal('amount', 14, 2).alter();
      })
    );
}

export function down(knex) {
  return knex.schema
    .alterTable('payments', (table) => {
      table.string('flutterwave_tx_ref', 100);
      table.string('flutterwave_transaction_id', 100);
    })
    .then(() =>
      knex.raw(
        "UPDATE payments SET flutterwave_tx_ref = COALESCE(provider_ref, id::text), flutterwave_transaction_id = provider_transaction_id"
      )
    )
    .then(() => knex.raw('ALTER TABLE payments ALTER COLUMN flutterwave_tx_ref SET NOT NULL'))
    .then(() =>
      knex.raw(
        'CREATE UNIQUE INDEX payments_flutterwave_tx_ref_unique ON payments (flutterwave_tx_ref)'
      )
    )
    .then(() =>
      knex.schema.alterTable('payments', (table) => {
        table.dropColumn('provider');
        table.dropColumn('provider_ref');
        table.dropColumn('provider_transaction_id');
        table.dropColumn('checkout_url');
      })
    );
}
