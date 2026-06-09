export function up(knex) {
  return knex.schema.createTable('audit_log', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.string('action').notNullable();
    table.string('resource_type').notNullable();
    table.uuid('resource_id');
    table.jsonb('details');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.index(['resource_type', 'resource_id']);
    table.index('created_at');
  });
}

export function down(knex) {
  return knex.schema.dropTable('audit_log');
}
