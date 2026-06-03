export function up(knex) {
  return knex.schema.table('expenses', (table) => {
    table.text('paid_proof_url');
    table.text('paid_note');
  });
}

export function down(knex) {
  return knex.schema.table('expenses', (table) => {
    table.dropColumn('paid_proof_url');
    table.dropColumn('paid_note');
  });
}
