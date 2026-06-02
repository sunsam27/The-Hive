import fs from 'fs';
import path from 'path';
import db from '../db/index.js';
import { checkExpenseAccess, checkWorkspaceAccess } from '../utils/accessControl.js';

const VALID_TRANSITIONS = {
  draft: ['submitted'],
  submitted: ['approved', 'rejected'],
  approved: ['paid'],
  rejected: ['submitted'],
  paid: [],
};

export async function list(req, res, next) {
  try {
    const { workspaceId, status, category, dateFrom, dateTo, sortBy, sortOrder } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    let baseQuery = db('expenses')
      .join('users', 'expenses.submitter_id', 'users.id')
      .join('workspace_members', 'expenses.workspace_id', 'workspace_members.workspace_id')
      .where('workspace_members.user_id', req.user.id);

    if (workspaceId) baseQuery = baseQuery.where('expenses.workspace_id', workspaceId);
    if (status) baseQuery = baseQuery.where('expenses.status', status);
    if (category) baseQuery = baseQuery.where('expenses.category', category);
    if (dateFrom) baseQuery = baseQuery.where('expenses.expense_date', '>=', dateFrom);
    if (dateTo) baseQuery = baseQuery.where('expenses.expense_date', '<=', dateTo);

    const allowedSorts = ['created_at', 'expense_date', 'amount', 'merchant'];
    const column = allowedSorts.includes(sortBy) ? `expenses.${sortBy}` : 'expenses.created_at';
    const dir = sortOrder === 'asc' ? 'asc' : 'desc';

    const { count } = (await baseQuery.clone().countDistinct('expenses.id as count').first()) || { count: 0 };

    const expenses = await baseQuery
      .clone()
      .select('expenses.*', 'users.name as submitter_name')
      .orderBy(column, dir)
      .limit(limit)
      .offset(offset);

    res.json({ data: expenses, total: parseInt(count), page, limit });
  } catch (err) {
    next(err);
  }
}

export async function exportCsv(req, res, next) {
  try {
    const { workspaceId, status, category, dateFrom, dateTo } = req.query;

    let baseQuery = db('expenses')
      .join('users', 'expenses.submitter_id', 'users.id')
      .join('workspace_members', 'expenses.workspace_id', 'workspace_members.workspace_id')
      .where('workspace_members.user_id', req.user.id);

    if (workspaceId) baseQuery = baseQuery.where('expenses.workspace_id', workspaceId);
    if (status) baseQuery = baseQuery.where('expenses.status', status);
    if (category) baseQuery = baseQuery.where('expenses.category', category);
    if (dateFrom) baseQuery = baseQuery.where('expenses.expense_date', '>=', dateFrom);
    if (dateTo) baseQuery = baseQuery.where('expenses.expense_date', '<=', dateTo);

    const expenses = await baseQuery
      .clone()
      .select('expenses.*', 'users.name as submitter_name')
      .orderBy('expenses.created_at', 'desc');

    const headers = ['ID', 'Merchant', 'Amount', 'Currency', 'Category', 'Status', 'Date', 'Description', 'Notes', 'Submitted By', 'Created At'];
    const rows = expenses.map((e) => [
      e.id,
      e.merchant || '',
      e.amount || 0,
      e.currency || 'USD',
      e.category || '',
      e.status,
      e.expense_date ? e.expense_date.toISOString().slice(0, 10) : '',
      (e.description || '').replace(/"/g, '""'),
      (e.notes || '').replace(/"/g, '""'),
      e.submitter_name || '',
      e.created_at ? e.created_at.toISOString() : '',
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { workspaceId, amount, merchant, expenseDate, currency, category, description, notes } = req.validated;
    const hasAccess = await checkWorkspaceAccess(workspaceId, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const [expense] = await db('expenses')
      .insert({
        workspace_id: workspaceId,
        submitter_id: req.user.id,
        amount,
        merchant,
        expense_date: expenseDate,
        currency: currency || 'USD',
        category,
        description,
        notes,
        status: 'draft',
      })
      .returning('*');
    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const expense = await checkExpenseAccess(req.params.id, req.user.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    if (expense.status !== 'draft' && expense.status !== 'rejected') {
      return res.status(400).json({ error: 'Only draft or rejected expenses can be edited' });
    }

    const allowedFields = ['amount', 'merchant', 'expense_date', 'currency', 'category', 'description', 'notes'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.validated[field] !== undefined) updates[field] = req.validated[field];
    }

    const [updated] = await db('expenses')
      .where({ id: req.params.id })
      .update(updates)
      .returning('*');

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function submit(req, res, next) {
  try {
    const expense = await checkExpenseAccess(req.params.id, req.user.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    if (!VALID_TRANSITIONS[expense.status]?.includes('submitted')) {
      return res.status(400).json({ error: `Cannot submit expense in status '${expense.status}'` });
    }

    if (expense.submitter_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the creator can submit this expense' });
    }

    const [updated] = await db('expenses')
      .where({ id: req.params.id })
      .update({ status: 'submitted', submitted_at: new Date() })
      .returning('*');

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const expense = await db('expenses')
      .join('users', 'expenses.submitter_id', 'users.id')
      .select('expenses.*', 'users.name as submitter_name')
      .where('expenses.id', req.params.id)
      .first();

    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    const hasAccess = await checkWorkspaceAccess(expense.workspace_id, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const receipts = await db('receipts').where({ expense_id: req.params.id });
    const tags = await db('expense_tags').where({ expense_id: req.params.id }).select('name');

    res.json({ ...expense, receipts, tags: tags.map((t) => t.name) });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const expense = await checkExpenseAccess(req.params.id, req.user.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    if (expense.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft expenses can be deleted' });
    }

    if (expense.submitter_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the creator can delete this expense' });
    }

    const receipts = await db('receipts').where({ expense_id: req.params.id });
    await db('expense_tags').where({ expense_id: req.params.id }).del();
    await db('receipts').where({ expense_id: req.params.id }).del();
    await db('expenses').where({ id: req.params.id }).del();

    for (const r of receipts) {
      const filename = r.file_url.replace('/uploads/receipts/', '');
      const filePath = path.resolve('uploads/receipts', filename);
      try { fs.unlinkSync(filePath); } catch { }
    }


    res.json({ message: 'Expense deleted' });
  } catch (err) {
    next(err);
  }
}

export async function pay(req, res, next) {
  try {
    const expense = await checkExpenseAccess(req.params.id, req.user.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    if (expense.status !== 'approved') {
      return res.status(400).json({ error: 'Only approved expenses can be marked as paid' });
    }

    const [updated] = await db('expenses')
      .where({ id: req.params.id })
      .update({ status: 'paid' })
      .returning('*');

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function submitAllDrafts(req, res, next) {
  try {
    const drafts = await db('expenses')
      .join('workspace_members', 'expenses.workspace_id', 'workspace_members.workspace_id')
      .where('workspace_members.user_id', req.user.id)
      .where('expenses.status', 'draft')
      .select('expenses.id');

    if (drafts.length === 0) {
      return res.json({ submitted: 0 });
    }

    const ids = drafts.map((d) => d.id);

    await db('expenses')
      .whereIn('id', ids)
      .update({ status: 'submitted', submitted_at: new Date() });

    res.json({ submitted: ids.length });
  } catch (err) {
    next(err);
  }
}

export async function review(req, res, next) {
  try {
    const { status, notes } = req.validated;
    const expense = await checkExpenseAccess(req.params.id, req.user.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    if (!VALID_TRANSITIONS[expense.status]?.includes(status)) {
      return res.status(400).json({ error: `Cannot change from '${expense.status}' to '${status}'` });
    }

    if (status === 'rejected' && !notes) {
      return res.status(400).json({ error: 'A rejection note is required' });
    }

    const updates = { status };

    if (status === 'approved') {
      updates.reviewed_by = req.user.id;
      updates.reviewed_at = new Date();
    }

    if (status === 'rejected') {
      updates.rejection_note = notes;
      updates.reviewed_by = req.user.id;
      updates.reviewed_at = new Date();
    }

    const [updated] = await db('expenses').where({ id: req.params.id }).update(updates).returning('*');

    res.json(updated);
  } catch (err) {
    next(err);
  }
}
