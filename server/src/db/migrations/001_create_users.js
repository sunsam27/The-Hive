export function up(knex) {
  return knex.schema
    .createTable('users', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.string('email').notNullable().unique();
      table.string('password_hash').notNullable();
      table.string('role').defaultTo('freelancer');
      table.timestamps(true, true);
    })
    .createTable('workspaces', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('name').notNullable();
      table.string('description');
      table.uuid('owner_id').references('id').inTable('users').onDelete('CASCADE');
      table.timestamps(true, true);
    })
    .createTable('workspace_members', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('workspace_id').references('id').inTable('workspaces').onDelete('CASCADE');
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('role').defaultTo('member');
      table.unique(['workspace_id', 'user_id']);
      table.timestamps(true, true);
    })
    .createTable('expenses', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('workspace_id').references('id').inTable('workspaces').onDelete('CASCADE');
      table.uuid('submitter_id').references('id').inTable('users').onDelete('CASCADE');
      table.decimal('amount', 10, 2).notNullable();
      table.string('merchant');
      table.date('expense_date');
      table.string('category');
      table.text('description');
      table.string('receipt_url');
      table.string('status').defaultTo('draft');
      table.uuid('reviewed_by').references('id').inTable('users');
      table.timestamp('reviewed_at');
      table.text('review_notes');
      table.timestamps(true, true);
    });
}

export function down(knex) {
  return knex.schema
    .dropTableIfExists('expenses')
    .dropTableIfExists('workspace_members')
    .dropTableIfExists('workspaces')
    .dropTableIfExists('users');
}
