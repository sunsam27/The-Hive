import db from '../db/index.js';

interface Expense {
  id: string;
  workspace_id: string;
  submitter_id: string;
  merchant: string;
  amount: number;
  currency: string;
  status: string;
  expense_date: string;
  created_at: string;
}

export async function checkWorkspaceAccess(workspaceId: string, userId: string): Promise<boolean> {
  const member = await db('workspace_members')
    .where({ workspace_id: workspaceId, user_id: userId })
    .first();
  return !!member;
}

export async function checkExpenseAccess(expenseId: string, userId: string): Promise<Expense | null> {
  const expense: Expense | undefined = await db('expenses').where({ id: expenseId }).first();
  if (!expense) return null;
  const hasAccess = await checkWorkspaceAccess(expense.workspace_id, userId);
  return hasAccess ? expense : null;
}

export async function checkReviewerRole(expenseId: string, userId: string): Promise<Expense | null> {
  const expense = await checkExpenseAccess(expenseId, userId);
  if (!expense) return null;
  const member = await db('workspace_members')
    .where({ workspace_id: expense.workspace_id, user_id: userId })
    .first();
  if (!member || !['admin', 'client'].includes(member.role)) return null;
  return expense;
}
