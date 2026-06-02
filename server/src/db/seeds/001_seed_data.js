export async function seed(knex) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot run seeds in production');
  }
  await knex('expenses').del();
  await knex('workspace_members').del();
  await knex('workspaces').del();
  await knex('users').del();
}
