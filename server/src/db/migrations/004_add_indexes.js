export function up(knex) {
  return knex.schema
    .raw('CREATE INDEX IF NOT EXISTS idx_expenses_workspace_id ON expenses (workspace_id)')
    .raw('CREATE INDEX IF NOT EXISTS idx_expenses_submitter_id ON expenses (submitter_id)')
    .raw('CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses (status)')
    .raw('CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses (expense_date)')
    .raw('CREATE INDEX IF NOT EXISTS idx_expenses_workspace_status ON expenses (workspace_id, status)')
    .raw('CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members (workspace_id)')
    .raw('CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members (user_id)');
}

export function down(knex) {
  return knex.schema
    .raw('DROP INDEX IF EXISTS idx_expenses_workspace_id')
    .raw('DROP INDEX IF EXISTS idx_expenses_submitter_id')
    .raw('DROP INDEX IF EXISTS idx_expenses_status')
    .raw('DROP INDEX IF EXISTS idx_expenses_expense_date')
    .raw('DROP INDEX IF EXISTS idx_expenses_workspace_status')
    .raw('DROP INDEX IF EXISTS idx_workspace_members_workspace_id')
    .raw('DROP INDEX IF EXISTS idx_workspace_members_user_id');
}
