export function up(knex) {
  return knex
    .raw('ALTER TABLE payments ADD COLUMN IF NOT EXISTS provider_session_id varchar(255)')
    .then(() =>
      knex.raw(`
        CREATE TABLE IF NOT EXISTS payment_accounts (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          provider varchar(32) NOT NULL,
          provider_account_id varchar(255) NOT NULL,
          status varchar(32) NOT NULL DEFAULT 'pending',
          details_submitted boolean NOT NULL DEFAULT false,
          charges_enabled boolean NOT NULL DEFAULT false,
          payouts_enabled boolean NOT NULL DEFAULT false,
          business_name varchar(255),
          display_label varchar(255),
          meta jsonb,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT payment_accounts_user_id_provider_unique UNIQUE (user_id, provider)
        )
      `)
    )
    .then(() =>
      knex.raw(
        'CREATE INDEX IF NOT EXISTS payment_accounts_provider_account_id_index ON payment_accounts (provider, provider_account_id)'
      )
    )
    .then(() =>
      knex.raw(
        'CREATE INDEX IF NOT EXISTS payment_accounts_provider_payouts_index ON payment_accounts (provider, payouts_enabled)'
      )
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
            ELSE 'flutterwave'
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
  return knex
    .raw('DROP TABLE IF EXISTS payment_accounts')
    .then(() => knex.raw('ALTER TABLE payments DROP COLUMN IF EXISTS provider_session_id'));
}
