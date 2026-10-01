import { Knex } from 'knex';
import { planDefinition } from '../config/plans.js';
import { resolvePlan } from '../services/entitlements.js';

export async function logAudit(
  dbOrTrx: Knex | Knex.Transaction,
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string | null,
  details?: Record<string, unknown>
) {
  const payload = {
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details: details ? JSON.stringify(details) : null,
  };
  return dbOrTrx('audit_log').insert(payload);
}

/**
 * The free plan only keeps a rolling window of history, so reads are bounded to
 * it rather than trusting the client to hide anything. Pro reads everything.
 */
export function auditRetentionSince(workspace: { id: string; plan?: string | null; paid_until?: string | Date | null } | null): Date | null {
  const days = planDefinition(resolvePlan(workspace)).limits.auditLogRetentionDays;
  if (days === null) return null;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}
