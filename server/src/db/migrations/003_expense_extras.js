export function up(knex) {
  return knex.schema
    .table('expenses', (table) => {
      table.string('currency', 3).defaultTo('USD');
      table.timestamp('submitted_at');
      table.text('rejection_note');
    })
    .createTable('receipts', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('expense_id').references('id').inTable('expenses').onDelete('CASCADE');
      table.string('file_url').notNullable();
      table.text('ocr_raw_text');
      table.timestamp('uploaded_at').defaultTo(knex.fn.now());
    })
    .createTable('expense_tags', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('expense_id').references('id').inTable('expenses').onDelete('CASCADE');
      table.string('name').notNullable();
      table.unique(['expense_id', 'name']);
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('expense_tags')
    .dropTableIfExists('receipts')
    .table('expenses', (table) => {
      table.dropColumn('currency');
      table.dropColumn('submitted_at');
      table.dropColumn('rejection_note');
    });
}
