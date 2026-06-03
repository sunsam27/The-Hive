import db from '../db/index.js';
import { checkWorkspaceAccess } from '../utils/accessControl.js';

export async function getByWorkspace(req, res, next) {
  try {
    const { workspaceId } = req.params;
    const { dateFrom, dateTo } = req.query;

    const hasAccess = await checkWorkspaceAccess(workspaceId, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    let query = db('expenses')
      .join('users', 'expenses.submitter_id', 'users.id')
      .select('expenses.*', 'users.name as submitter_name')
      .where('expenses.workspace_id', workspaceId);

    if (dateFrom) query = query.where('expenses.expense_date', '>=', dateFrom);
    if (dateTo) query = query.where('expenses.expense_date', '<=', dateTo);

    const expenses = await query.orderBy('expenses.expense_date', 'desc');

    const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const pending = expenses.filter((e) => e.status === 'draft' || e.status === 'submitted');
    const approved = expenses.filter((e) => e.status === 'approved');
    const rejected = expenses.filter((e) => e.status === 'rejected');

    res.json({ expenses, summary: { total, pending: pending.length, approved: approved.length, rejected: rejected.length } });
  } catch (err) {
    next(err);
  }
}
