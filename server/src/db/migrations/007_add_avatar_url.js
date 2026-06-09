export function up(knex) {
  return knex.schema.table('users', (table) => {
    table.text('avatar_url');
  });
}

export function down(knex) {
  return knex.schema.table('users', (table) => {
    table.dropColumn('avatar_url');
  });
}
