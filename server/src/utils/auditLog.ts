import { Knex } from 'knex';

export async function logAudit(
  dbOrTrx: Knex | Knex.Transaction,
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
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
