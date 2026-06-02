export function up(knex) {
  return knex.schema.table('expenses', (table) => {
    table.text('notes');
  });
}

export function down(knex) {
  return knex.schema.table('expenses', (table) => {
    table.dropColumn('notes');
  });
}
