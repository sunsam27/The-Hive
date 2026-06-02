export function up(knex) {
  return knex.schema
    .table('users', (table) => {
      table.boolean('verified').defaultTo(false);
      table.string('verification_token');
      table.string('reset_token');
      table.timestamp('reset_token_expires');
    });
}

export function down(knex) {
  return knex.schema
    .table('users', (table) => {
      table.dropColumn('verified');
      table.dropColumn('verification_token');
      table.dropColumn('reset_token');
      table.dropColumn('reset_token_expires');
    });
}
