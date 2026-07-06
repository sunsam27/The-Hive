import { Request, Response, NextFunction } from 'express';
import db from '../db/index.js';
import { checkExpenseAccess, checkWorkspaceAccess, checkReviewerRole } from '../utils/accessControl.js';
import { logAudit } from '../utils/auditLog.js';
import { uploadFile, deleteFile } from '../utils/cloudinary.js';

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['submitted'],
  submitted: ['approved', 'rejected'],
  approved: ['paid'],
  rejected: ['submitted'],
  paid: [],
};

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const workspaceId = req.query.workspaceId as string | undefined;
    const status = req.query.status as string | undefined;
    const category = req.query.category as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;
    const sortBy = req.query.sortBy as string | undefined;
    const sortOrder = req.query.sortOrder as string | undefined;

    const userId = req.user!.id;

    function applyFilters(query: any) {
      let q = query
        .join('users', 'expenses.submitter_id', 'users.id')
        .join('workspace_members', 'expenses.workspace_id', 'workspace_members.workspace_id')
        .where('workspace_members.user_id', userId);
      if (workspaceId) q = q.where('expenses.workspace_id', workspaceId);
      if (status) q = q.where('expenses.status', status);
      if (category) q = q.where('expenses.category', category);
      if (dateFrom) q = q.where('expenses.expense_date', '>=', dateFrom);
      if (dateTo) q = q.where('expenses.expense_date', '<=', dateTo);
      return q;
    }

    const allowedSorts = ['created_at', 'expense_date', 'amount', 'merchant'];
    const sb = sortBy || '';
    const column = allowedSorts.includes(sb) ? `expenses.${sb}` : 'expenses.created_at';
    const dir = sortOrder === 'asc' ? 'asc' : 'desc';

    const countResult = await applyFilters(db('expenses')).countDistinct('expenses.id as count').first();
    const total = Number(countResult?.count ?? 0);

    const expenses = await applyFilters(db('expenses'))
      .select('expenses.*', 'users.name as submitter_name')
      .orderBy(column, dir)
      .limit(limit)
      .offset(offset);

    res.json({ data: expenses, total, page, limit });
  } catch (err) {
    next(err);
  }
}

export async function exportCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = req.query.workspaceId as string | undefined;
    const status = req.query.status as string | undefined;
    const category = req.query.category as string | undefined;
    const dateFrom = req.query.dateFrom as string | undefined;
    const dateTo = req.query.dateTo as string | undefined;

    let baseQuery = db('expenses')
      .join('users', 'expenses.submitter_id', 'users.id')
      .join('workspace_members', 'expenses.workspace_id', 'workspace_members.workspace_id')
      .where('workspace_members.user_id', req.user!.id);

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
    const rows = expenses.map((e: any) => [
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

    const csv = [headers.join(','), ...rows.map((r: string[]) => r.map((c: string) => `"${c}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=expenses.csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId, amount, merchant, expenseDate, currency, category, description, notes } = req.validated as any;
    const hasAccess = await checkWorkspaceAccess(workspaceId, req.user!.id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const [expense] = await db('expenses')
      .insert({
        workspace_id: workspaceId,
        submitter_id: req.user!.id,
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

    await logAudit(db, req.user!.id, 'expense.created', 'expense', expense.id, { workspaceId, amount, merchant });

    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const expense = await checkExpenseAccess(id, req.user!.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    if (expense.status !== 'draft' && expense.status !== 'rejected') {
      return res.status(400).json({ error: 'Only draft or rejected expenses can be edited' });
    }

    const allowedFields = ['amount', 'merchant', 'expense_date', 'currency', 'category', 'description', 'notes'];
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.validated?.[field] !== undefined) updates[field] = req.validated[field];
    }

    const [updated] = await db('expenses')
      .where({ id })
      .update(updates)
      .returning('*');

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function submit(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const expense = await checkExpenseAccess(id, req.user!.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    if (!VALID_TRANSITIONS[expense.status]?.includes('submitted')) {
      return res.status(400).json({ error: `Cannot submit expense in status '${expense.status}'` });
    }

    if (expense.submitter_id !== req.user!.id) {
      return res.status(403).json({ error: 'Only the creator can submit this expense' });
    }

    const [updated] = await db('expenses')
      .where({ id })
      .update({ status: 'submitted', submitted_at: new Date() })
      .returning('*');

    await logAudit(db, req.user!.id, 'expense.submitted', 'expense', id);

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const expense = await db('expenses')
      .join('users', 'expenses.submitter_id', 'users.id')
      .select('expenses.*', 'users.name as submitter_name')
      .where('expenses.id', id)
      .first();

    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    const hasAccess = await checkWorkspaceAccess(expense.workspace_id, req.user!.id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const receipts = await db('receipts').where({ expense_id: id });
    const tags = await db('expense_tags').where({ expense_id: id }).select('name');

    let invoice = null;
    if (expense.invoice_id) {
      invoice = await db('invoices').where({ id: expense.invoice_id }).first();
    }

    const member = await db('workspace_members')
      .where({ workspace_id: expense.workspace_id, user_id: req.user!.id })
      .first();
    const canReview = member && ['admin', 'client'].includes(member.role);

    res.json({ ...expense, receipts, tags: tags.map((t: any) => t.name), canReview, invoice });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const expense = await checkExpenseAccess(id, req.user!.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    if (expense.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft expenses can be deleted' });
    }

    if (expense.submitter_id !== req.user!.id) {
      return res.status(403).json({ error: 'Only the creator can delete this expense' });
    }

    await db.transaction(async (trx: any) => {
      const receipts = await trx('receipts').where({ expense_id: id });
      await trx('expense_tags').where({ expense_id: id }).del();
      await trx('receipts').where({ expense_id: id }).del();
      await trx('expenses').where({ id }).del();

      await logAudit(trx, req.user!.id, 'expense.deleted', 'expense', id, { title: expense.merchant });

      for (const r of receipts) {
        await deleteFile(r.file_url);
      }
    });

    res.json({ message: 'Expense deleted' });
  } catch (err) {
    next(err);
  }
}

export async function pay(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const expense = await checkReviewerRole(id, req.user!.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    if (expense.status !== 'approved') {
      return res.status(400).json({ error: 'Only approved expenses can be marked as paid' });
    }

    if (!req.file && !req.body.note) {
      return res.status(400).json({ error: 'You must provide either a proof file or a note when marking as paid' });
    }

    const updates: Record<string, any> = { status: 'paid' };
    if (req.file) {
      updates.paid_proof_url = await uploadFile(req.file.buffer, 'proofs');
    }
    if (req.body.note) {
      updates.paid_note = req.body.note;
    }

    const [updated] = await db('expenses')
      .where({ id })
      .update(updates)
      .returning('*');

    await logAudit(db, req.user!.id, 'expense.paid', 'expense', id, { hasProof: !!req.file, hasNote: !!req.body.note });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function submitAllDrafts(req: Request, res: Response, next: NextFunction) {
  try {
    const drafts = await db('expenses')
      .join('workspace_members', 'expenses.workspace_id', 'workspace_members.workspace_id')
      .where('workspace_members.user_id', req.user!.id)
      .where('expenses.submitter_id', req.user!.id)
      .where('expenses.status', 'draft')
      .select('expenses.id');

    if (drafts.length === 0) {
      return res.json({ submitted: 0 });
    }

    const ids = drafts.map((d: any) => d.id);

    await db.transaction(async (trx: any) => {
      await trx('expenses')
        .whereIn('id', ids)
        .update({ status: 'submitted', submitted_at: new Date() });

      for (const id of ids) {
        await logAudit(trx, req.user!.id, 'expense.submitted', 'expense', id);
      }
    });

    res.json({ submitted: ids.length });
  } catch (err) {
    next(err);
  }
}

export async function review(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, notes } = req.validated as { status: string; notes?: string };
    const id = req.params.id as string;
    const expense = await checkReviewerRole(id, req.user!.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    if (!VALID_TRANSITIONS[expense.status]?.includes(status)) {
      return res.status(400).json({ error: `Cannot change from '${expense.status}' to '${status}'` });
    }

    if (status === 'rejected' && !notes) {
      return res.status(400).json({ error: 'A rejection note is required' });
    }

    const updates: Record<string, any> = { status };

    if (status === 'approved') {
      updates.reviewed_by = req.user!.id;
      updates.reviewed_at = new Date();
    }

    if (status === 'rejected') {
      updates.rejection_note = notes;
      updates.reviewed_by = req.user!.id;
      updates.reviewed_at = new Date();
    }

    const [updated] = await db('expenses').where({ id }).update(updates).returning('*');

    await logAudit(db, req.user!.id, `expense.${status}`, 'expense', id, status === 'rejected' ? { rejectionNote: notes } : undefined);

    res.json(updated);
  } catch (err) {
    next(err);
  }
}
