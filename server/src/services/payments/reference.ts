/**
 * Expense references keep their original shape because they are already stored
 * in the `payments` table and referenced by provider dashboards and webhooks.
 * Plan references are namespaced separately so the webhook can tell an incoming
 * plan payment apart from an expense reimbursement.
 */
export function generatePaymentReference(expenseId: string): string {
  const timestamp = Date.now();
  const random = randomSuffix();
  return `FINSYTE-${expenseId.slice(0, 8)}-${timestamp}-${random}`;
}

export function generatePlanReference(workspaceId: string): string {
  const timestamp = Date.now();
  return `${PLAN_REFERENCE_PREFIX}${workspaceId.slice(0, 8)}-${timestamp}-${randomSuffix()}`;
}

export const PLAN_REFERENCE_PREFIX = 'FINSYTE-PRO-';

export function isPlanReference(reference: string | null | undefined): boolean {
  return typeof reference === 'string' && reference.startsWith(PLAN_REFERENCE_PREFIX);
}

function randomSuffix(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
