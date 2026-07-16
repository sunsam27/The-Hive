let app;

async function ensureTables(db) {
  const has = async (t) => (await db.schema.hasTable(t));

  if (!(await has('users'))) {
    await db.schema.createTable('users', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      t.string('name').notNullable();
      t.string('email').notNullable().unique();
      t.string('password_hash').notNullable();
      t.string('role').defaultTo('freelancer');
      t.boolean('verified').defaultTo(false);
      t.string('verification_token');
      t.string('reset_token');
      t.timestamp('reset_token_expires');
      t.text('avatar_url');
      t.timestamps(true, true);
    });
  }

  if (!(await has('workspaces'))) {
    await db.schema.createTable('workspaces', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      t.string('name').notNullable();
      t.string('description');
      t.uuid('owner_id').references('id').inTable('users').onDelete('CASCADE');
      t.timestamps(true, true);
    });
  }

  if (!(await has('workspace_members'))) {
    await db.schema.createTable('workspace_members', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      t.uuid('workspace_id').references('id').inTable('workspaces').onDelete('CASCADE');
      t.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      t.string('role').defaultTo('member');
      t.unique(['workspace_id', 'user_id']);
      t.timestamps(true, true);
    });
  }

  if (!(await has('invoices'))) {
    await db.schema.createTable('invoices', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      t.uuid('workspace_id').notNullable().references('id').inTable('workspaces').onDelete('CASCADE');
      t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.string('invoice_number', 20).notNullable().unique();
      t.text('service_desc').notNullable();
      t.decimal('amount', 10, 2).notNullable();
      t.string('currency', 3).notNullable().defaultTo('USD');
      t.string('client_name', 255);
      t.string('client_company', 255);
      t.string('client_email', 255);
      t.string('freelancer_name', 255).notNullable();
      t.string('freelancer_business', 255);
      t.string('freelancer_contact', 255);
      t.decimal('tax_amount', 10, 2).defaultTo(0);
      t.string('tax_desc', 255);
      t.text('payment_terms');
      t.text('notes');
      t.string('status', 20).notNullable().defaultTo('draft');
      t.timestamps(true, true);
    });
  }

  if (!(await has('expenses'))) {
    await db.schema.createTable('expenses', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      t.uuid('workspace_id').references('id').inTable('workspaces').onDelete('CASCADE');
      t.uuid('submitter_id').references('id').inTable('users').onDelete('CASCADE');
      t.decimal('amount', 10, 2).notNullable();
      t.string('merchant');
      t.date('expense_date');
      t.string('category');
      t.text('description');
      t.string('receipt_url');
      t.string('status').defaultTo('draft');
      t.uuid('reviewed_by').references('id').inTable('users');
      t.timestamp('reviewed_at');
      t.text('review_notes');
      t.string('currency', 3).defaultTo('USD');
      t.timestamp('submitted_at');
      t.text('rejection_note');
      t.text('notes');
      t.text('paid_proof_url');
      t.text('paid_note');
      t.uuid('invoice_id').references('id').inTable('invoices').onDelete('SET NULL');
      t.timestamps(true, true);
    });
  }

  if (!(await has('receipts'))) {
    await db.schema.createTable('receipts', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      t.uuid('expense_id').references('id').inTable('expenses').onDelete('CASCADE');
      t.string('file_url').notNullable();
      t.text('ocr_raw_text');
      t.timestamp('uploaded_at').defaultTo(db.fn.now());
    });
  }

  if (!(await has('expense_tags'))) {
    await db.schema.createTable('expense_tags', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      t.uuid('expense_id').references('id').inTable('expenses').onDelete('CASCADE');
      t.string('name').notNullable();
      t.unique(['expense_id', 'name']);
    });
  }

  if (!(await has('payments'))) {
    await db.schema.createTable('payments', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      t.uuid('expense_id').notNullable().references('id').inTable('expenses').onDelete('CASCADE');
      t.uuid('workspace_id').notNullable().references('id').inTable('workspaces').onDelete('CASCADE');
      t.uuid('payer_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.decimal('amount', 10, 2).notNullable();
      t.string('currency', 3).notNullable().defaultTo('USD');
      t.string('status', 20).notNullable().defaultTo('pending');
      t.string('flutterwave_tx_ref', 100).notNullable().unique();
      t.string('flutterwave_transaction_id', 100);
      t.timestamp('paid_at');
      t.timestamps(true, true);
    });
  }

  if (!(await has('audit_log'))) {
    await db.schema.createTable('audit_log', (t) => {
      t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
      t.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
      t.string('action').notNullable();
      t.string('resource_type').notNullable();
      t.uuid('resource_id');
      t.jsonb('details');
      t.timestamp('created_at').defaultTo(db.fn.now());
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
