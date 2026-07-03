export function up(knex) {
  return knex.schema
    .createTable('invoices', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('workspace_id').notNullable().references('id').inTable('workspaces').onDelete('CASCADE');
      table.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.string('invoice_number', 20).notNullable().unique();
      table.text('service_desc').notNullable();
      table.decimal('amount', 10, 2).notNullable();
      table.string('currency', 3).notNullable().defaultTo('USD');
      table.string('client_name', 255);
      table.string('client_company', 255);
      table.string('client_email', 255);
      table.string('freelancer_name', 255).notNullable();
      table.string('freelancer_business', 255);
      table.string('freelancer_contact', 255);
      table.decimal('tax_amount', 10, 2).defaultTo(0);
      table.string('tax_desc', 255);
      table.text('payment_terms');
      table.text('notes');
      table.string('status', 20).notNullable().defaultTo('draft');
      table.timestamps(true, true);
    })
    .createTable('payments', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('expense_id').notNullable().references('id').inTable('expenses').onDelete('CASCADE');
      table.uuid('workspace_id').notNullable().references('id').inTable('workspaces').onDelete('CASCADE');
      table.uuid('payer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.decimal('amount', 10, 2).notNullable();
      table.string('currency', 3).notNullable().defaultTo('USD');
      table.string('status', 20).notNullable().defaultTo('pending');
      table.string('flutterwave_tx_ref', 100).notNullable().unique();
      table.string('flutterwave_transaction_id', 100);
      table.timestamp('paid_at');
      table.timestamps(true, true);
    })
    .table('expenses', (table) => {
      table.uuid('invoice_id').references('id').inTable('invoices').onDelete('SET NULL');
    });
}

export function down(knex) {
  return knex.schema
    .table('expenses', (table) => {
      table.dropColumn('invoice_id');
    })
    .dropTableIfExists('payments')
    .dropTableIfExists('invoices');
}
