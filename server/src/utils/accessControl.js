import db from '../db/index.js';

export async function checkWorkspaceAccess(workspaceId, userId) {
  const member = await db('workspace_members')
    .where({ workspace_id: workspaceId, user_id: userId })
    .first();
  return !!member;
}

export async function checkExpenseAccess(expenseId, userId) {
  const expense = await db('expenses').where({ id: expenseId }).first();
  if (!expense) return null;
  const hasAccess = await checkWorkspaceAccess(expense.workspace_id, userId);
  return hasAccess ? expense : null;
}

export async function checkReviewerRole(expenseId, userId) {
  const expense = await checkExpenseAccess(expenseId, userId);
  if (!expense) return null;
  const member = await db('workspace_members')
    .where({ workspace_id: expense.workspace_id, user_id: userId })
    .first();
  if (!member || !['admin', 'client'].includes(member.role)) return null;
  return expense;
}
