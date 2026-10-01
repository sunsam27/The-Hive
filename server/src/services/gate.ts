import db from '../db/index.js';
import {
  type PlanName,
  type UsageMetric,
  proAnnualPrice,
  planDefinition,
} from '../config/plans.js';
import {
  type WorkspacePlanRow,
  countMembers,
  countWorkspaces,
  currentUsage,
  recordUsage,
  resolvePlan,
  usageSnapshot,
} from './entitlements.js';

export async function loadWorkspacePlan(workspaceId: string): Promise<WorkspacePlanRow> {
  const workspace = await db('workspaces')
    .where({ id: workspaceId })
    .select('id', 'plan', 'paid_until')
    .first();
  return workspace ?? { id: workspaceId, plan: 'free', paid_until: null };
}

export interface LimitRejection {
  status: number;
  body: Record<string, unknown>;
}

function upgradeRequired(message: string, extra: Record<string, unknown> = {}): LimitRejection {
  const pro = planDefinition('pro');
  return {
    status: 402,
    body: {
      error: message,
      code: 'plan_limit_reached',
      plan: 'free',
      upgrade: { plan: pro.name, priceUsd: proAnnualPrice('USD') },
      ...extra,
    },
  };
}

/** Count-only check. Safe for read paths and for limits enforced outside a transaction. */
export async function checkMonthlyLimit(
  workspaceId: string,
  metric: UsageMetric
): Promise<LimitRejection | null> {
  const workspace = await loadWorkspacePlan(workspaceId);
  const snapshot = await usageSnapshot(workspace, metric);

  if (snapshot.limit !== null && snapshot.used >= snapshot.limit) {
    return upgradeRequired(
      `The free plan allows ${snapshot.limit} ${metric === 'ocr' ? 'receipt scans' : 'invoices'} per month.`,
      { metric, used: snapshot.used, limit: snapshot.limit }
    );
  }

  return null;
}

export async function checkWorkspaceCount(userId: string): Promise<LimitRejection | null> {
  const owned = await db('workspaces').where({ owner_id: userId }).first();
  const workspace = owned ? await loadWorkspacePlan(owned.id) : null;
  const limit = planDefinition(resolvePlan(workspace)).limits.workspaces;

  if (limit !== null) {
    const count = await countWorkspaces(userId);
    if (count >= limit) {
      return upgradeRequired(`The free plan allows ${limit} workspace.`, { used: count, limit });
    }
  }

  return null;
}

export async function checkMemberCount(workspaceId: string): Promise<LimitRejection | null> {
  const workspace = await loadWorkspacePlan(workspaceId);
  const limit = planDefinition(resolvePlan(workspace)).limits.membersPerWorkspace;

  if (limit !== null) {
    const count = await countMembers(workspaceId);
    if (count >= limit) {
      return upgradeRequired(
        `The free plan allows ${limit} members per workspace.`,
        { used: count, limit }
      );
    }
  }

  return null;
}

/**
 * Counts a metered action once it has genuinely happened, so a failed OCR call
 * or a rolled back transaction never burns quota.
 */
export async function consumeMetric(workspaceId: string, metric: UsageMetric, amount = 1): Promise<void> {
  await db.transaction(async (trx: any) => {
    await recordUsage(trx, workspaceId, metric, amount);
  });
}

export async function monthlyUsage(workspaceId: string): Promise<Record<UsageMetric, Awaited<ReturnType<typeof usageSnapshot>>>> {
  const workspace = await loadWorkspacePlan(workspaceId);
  const [invoices, ocr] = await Promise.all([
    usageSnapshot(workspace, 'invoices', await currentUsage(workspaceId, 'invoices')),
    usageSnapshot(workspace, 'ocr', await currentUsage(workspaceId, 'ocr')),
  ]);
  return { invoices, ocr };
}

export function planFor(workspace: WorkspacePlanRow): PlanName {
  return resolvePlan(workspace);
}
