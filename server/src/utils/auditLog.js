export async function logAudit(dbOrTrx, userId, action, resourceType, resourceId, details) {
  const payload = {
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details: details ? JSON.stringify(details) : null,
  };
  return dbOrTrx('audit_log').insert(payload);
}

export async function logAuditWithTrx(trx, userId, action, resourceType, resourceId, details) {
  return logAudit(trx, userId, action, resourceType, resourceId, details);
}
