export function up(knex) {
  return knex
    .raw("ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS plan varchar(16) NOT NULL DEFAULT 'free'")
    .then(() => knex.raw('ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS paid_until timestamptz'))
    .then(() =>
      knex.raw(`
        CREATE TABLE IF NOT EXISTS plan_purchases (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
          purchaser_id uuid REFERENCES users(id) ON DELETE SET NULL,
          provider varchar(32) NOT NULL,
          provider_ref varchar(255),
          provider_transaction_id varchar(255),
          plan varchar(16) NOT NULL,
          period_months integer NOT NULL DEFAULT 12,
          amount numeric(14, 2) NOT NULL DEFAULT 0,
          currency varchar(8) NOT NULL DEFAULT 'USD',
          period_start timestamptz,
          period_end timestamptz,
          status varchar(32) NOT NULL DEFAULT 'pending',
          meta jsonb,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now()
        )
      `)
    )
    .then(() =>
      knex.raw(
        'CREATE INDEX IF NOT EXISTS plan_purchases_workspace_id_index ON plan_purchases (workspace_id)'
      )
    )
    .then(() =>
      knex.raw(
        'CREATE UNIQUE INDEX IF NOT EXISTS plan_purchases_provider_ref_unique ON plan_purchases (provider, provider_ref) WHERE provider_ref IS NOT NULL'
      )
    )
    .then(() =>
      knex.raw(`
        CREATE TABLE IF NOT EXISTS plan_usage (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
          metric varchar(32) NOT NULL,
          period_start date NOT NULL,
          used integer NOT NULL DEFAULT 0,
          updated_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT plan_usage_workspace_metric_period_unique UNIQUE (workspace_id, metric, period_start)
        )
      `)
    )
    .then(() =>
      knex.raw(
        'CREATE INDEX IF NOT EXISTS plan_usage_workspace_metric_period_index ON plan_usage (workspace_id, metric, period_start)'
      )
    );
}

export function down(knex) {
  return knex
    .raw('DROP TABLE IF EXISTS plan_usage')
    .then(() => knex.raw('DROP TABLE IF EXISTS plan_purchases'))
    .then(() => knex.raw('ALTER TABLE workspaces DROP COLUMN IF EXISTS paid_until'))
    .then(() => knex.raw('ALTER TABLE workspaces DROP COLUMN IF EXISTS plan'));
}
