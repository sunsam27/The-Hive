import db from '../db/index.js';
import { type PlanName, type UsageMetric, planDefinition } from '../config/plans.js';

export interface WorkspacePlanRow {
  id: string;
  plan?: string | null;
  paid_until?: string | Date | null;
}

export interface Entitlement {
  plan: PlanName;
  /** True when the workspace was granted pro but the paid period has lapsed. */
  lapsed: boolean;
  paidUntil: string | null;
  limits: ReturnType<typeof planDefinition>['limits'];
}

export interface UsageSnapshot {
  metric: UsageMetric;
  used: number;
  limit: number | null;
  remaining: number | null;
}

function isPro(value: unknown): value is PlanName {
  return value === 'pro';
}

/**
 * A workspace is only Pro while `paid_until` is still in the future. A lapsed
 * workspace drops to Free but keeps full read access to its own records.
 */
export function resolvePlan(workspace: WorkspacePlanRow | null | undefined): PlanName {
  if (!workspace || !isPro(workspace.plan)) return 'free';
  if (!workspace.paid_until) return 'free';

  const paidUntil = new Date(workspace.paid_until);
  if (Number.isNaN(paidUntil.getTime())) return 'free';

  return paidUntil.getTime() > Date.now() ? 'pro' : 'free';
}

export function entitlementFor(workspace: WorkspacePlanRow | null | undefined): Entitlement {
  const plan = resolvePlan(workspace);
  const paidUntil = workspace?.paid_until ? new Date(workspace.paid_until) : null;

  return {
    plan,
    lapsed: isPro(workspace?.plan) && plan === 'free',
    paidUntil: paidUntil && !Number.isNaN(paidUntil.getTime()) ? paidUntil.toISOString() : null,
    limits: planDefinition(plan).limits,
  };
}

export function periodStart(reference: Date = new Date()): string {
  return reference.toISOString().slice(0, 10);
}

export async function currentUsage(workspaceId: string, metric: UsageMetric): Promise<number> {
  const row = await db('plan_usage')
    .where({ workspace_id: workspaceId, metric, period_start: periodStart() })
    .first();
  return row ? Number(row.used) : 0;
}

export async function recordUsage(trx: any, workspaceId: string, metric: UsageMetric, amount = 1): Promise<void> {
  await trx('plan_usage')
    .insert({
      workspace_id: workspaceId,
      metric,
      period_start: periodStart(),
      used: amount,
    })
    .onConflict(['workspace_id', 'metric', 'period_start'])
    .merge({ used: trx.raw('plan_usage.used + ?', [amount]) });
}

export async function usageSnapshot(
  workspace: WorkspacePlanRow,
  metric: UsageMetric,
  used?: number
): Promise<UsageSnapshot> {
  const plan = resolvePlan(workspace);
  const limit = planDefinition(plan).limits[`${metric}PerMonth`];
  const consumed = used ?? (await currentUsage(workspace.id, metric));

  return {
    metric,
    used: consumed,
    limit,
    remaining: limit === null ? null : Math.max(limit - consumed, 0),
  };
}

/**
 * Reserving a metered slot increments the counter and refuses the call when the
 * plan limit is already used up, so two concurrent requests cannot both pass a
 * limit check that only one of them may have.
 */
export async function reserveUsage(
  trx: any,
  workspace: WorkspacePlanRow,
  metric: UsageMetric
): Promise<{ allowed: true } | { allowed: false; used: number; limit: number }> {
  const limit = planDefinition(resolvePlan(workspace)).limits[`${metric}PerMonth`];
  if (limit === null) return { allowed: true };

  await recordUsage(trx, workspace.id, metric, 1);

  const row = await trx('plan_usage')
    .where({ workspace_id: workspace.id, metric, period_start: periodStart() })
    .first();
  const used = row ? Number(row.used) : 1;

  return used <= limit ? { allowed: true } : { allowed: false, used, limit };
}

export function limitFor(workspace: WorkspacePlanRow, key: 'workspaces' | 'membersPerWorkspace'): number | null {
  return planDefinition(resolvePlan(workspace)).limits[key];
}

export async function countWorkspaces(userId: string): Promise<number> {
  const row = await db('workspaces').where({ owner_id: userId }).count<{ count: string }[]>('id as count').first();
  return row ? Number(row.count) : 0;
}

export async function countMembers(workspaceId: string): Promise<number> {
  const row = await db('workspace_members')
    .where({ workspace_id: workspaceId })
    .count<{ count: string }[]>('user_id as count')
    .first();
  return row ? Number(row.count) : 0;
}
