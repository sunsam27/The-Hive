export function up(knex) {
  return knex.raw('ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_session_id varchar(255)')
    .then(() =>
      knex.schema.createTable('payment_accounts', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table
          .uuid('user_id')
          .notNullable()
          .references('id')
          .inTable('users')
          .onDelete('CASCADE');
        table.string('provider', 32).notNullable();
        table.string('provider_account_id', 255).notNullable();
        table.string('status', 32).notNullable().defaultTo('pending');
        table.boolean('details_submitted').notNullable().defaultTo(false);
        table.boolean('charges_enabled').notNullable().defaultTo(false);
        table.boolean('payouts_enabled').notNullable().defaultTo(false);
        table.string('business_name', 255);
        table.string('display_label', 255);
        table.jsonb('meta');
        table.timestamps(true, true);
        table.unique(['user_id', 'provider']);
      })
    )
    .then(() =>
      knex.schema.alterTable('payment_accounts', (table) => {
        table.index(['provider', 'provider_account_id']);
        table.index(['provider', 'payouts_enabled']);
      })
    )
    .then(() =>
      knex.raw(`
        INSERT INTO payment_accounts (
          user_id, provider, provider_account_id, status,
          details_submitted, charges_enabled, payouts_enabled,
          created_at, updated_at
        )
        SELECT
          id,
          CASE
            WHEN left(provider_account_id, 5) = 'acct_' THEN 'stripe'
            WHEN left(provider_account_id, 3) = 'RS_' THEN 'flutterwave'
          END,
          provider_account_id,
          'pending',
          false,
          false,
          false,
          NOW(),
          NOW()
        FROM users
        WHERE provider_account_id IS NOT NULL
          AND provider_account_id <> ''
          AND (
            left(provider_account_id, 5) = 'acct_'
            OR left(provider_account_id, 3) = 'RS_'
          )
        ON CONFLICT (user_id, provider) DO NOTHING
      `)
    );
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('payment_accounts')
    .then(() => knex.raw('ALTER TABLE payments DROP COLUMN IF EXISTS provider_session_id'));
}
