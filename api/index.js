let app;

async function ensureTables(db) {
  const hasInvoices = await db.schema.hasTable('invoices');
  if (!hasInvoices) {
    await db.schema.createTable('invoices', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
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
    });
  }

  const hasPayments = await db.schema.hasTable('payments');
  if (!hasPayments) {
    await db.schema.createTable('payments', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
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
    });
  }

  const hasExpensesInvoiceId = await db.schema.hasColumn('expenses', 'invoice_id');
  if (!hasExpensesInvoiceId) {
    await db.schema.alterTable('expenses', (table) => {
      table.uuid('invoice_id').references('id').inTable('invoices').onDelete('SET NULL');
    });
  }

  const hasAuditLog = await db.schema.hasTable('audit_log');
  if (!hasAuditLog) {
    await db.schema.createTable('audit_log', (table) => {
      table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
      table.string('action').notNullable();
      table.string('resource_type').notNullable();
      table.uuid('resource_id');
      table.jsonb('details');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.index(['resource_type', 'resource_id']);
      table.index('created_at');
    });
  }
}

module.exports = async (req, res) => {
  if (!app) {
    const dbMod = await import('../server/dist/db/index.js');
    const db = dbMod.default;
    await ensureTables(db);

    const mod = await import('../server/dist/app.js');
    app = mod.default;
  }
  return app(req, res);
};
