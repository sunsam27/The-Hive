import db from '../db/index.js';
import { numberFromEnv } from '../utils/env.js';
import { allPlans, proAnnualPrice, proAnnualPriceUsd, planDefinition } from '../config/plans.js';
import { entitlementFor, resolvePlan } from './entitlements.js';
import { loadWorkspacePlan, monthlyUsage } from './gate.js';

const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30;

export function renewalMonths(): number {
  return numberFromEnv('PRO_RENEWAL_MONTHS', planDefinition('pro').billingPeriodMonths);
}

/** Renewal always extends from the later of now and the current paid_until. */
export function periodEnd(from: Date, months: number): Date {
  const base = from.getTime();
  return new Date(base + months * MS_PER_MONTH);
}

/**
 * Grants the purchased period. The paid window extends from the current expiry
 * so an early renewal never shortens a period the workspace already paid for.
 */
export async function activatePlanPurchase(purchaseId: string): Promise<{ workspaceId: string; paidUntil: Date }> {
  return db.transaction(async (trx: any) => {
    const purchase = await trx('plan_purchases').where({ id: purchaseId }).first();
    if (!purchase) throw new Error('plan_purchases row not found');

    if (purchase.status === 'completed') {
      const existing = await trx('workspaces').where({ id: purchase.workspace_id }).first();
      return {
        workspaceId: purchase.workspace_id,
        paidUntil: new Date(existing?.paid_until),
      };
    }

    const now = new Date();
    const start = purchase.period_start ? new Date(purchase.period_start) : now;
    const current = await trx('workspaces').where({ id: purchase.workspace_id }).first();
    const currentExpiry = current?.paid_until ? new Date(current.paid_until) : null;

    const base = currentExpiry && currentExpiry.getTime() > start.getTime() ? currentExpiry : start;
    const end = periodEnd(base, Number(purchase.period_months) || renewalMonths());

    await trx('workspaces')
      .where({ id: purchase.workspace_id })
      .update({ plan: purchase.plan, paid_until: end });

    await trx('plan_purchases')
      .where({ id: purchaseId })
      .update({
        status: 'completed',
        period_start: start,
        period_end: end,
        updated_at: now,
      });

    return { workspaceId: purchase.workspace_id, paidUntil: end };
  });
}

export function publicPlan(planName: 'free' | 'pro') {
  const plan = planDefinition(planName);
  return {
    name: plan.name,
    label: plan.label,
    priceUsd: planName === 'pro' ? proAnnualPriceUsd() : 0,
    billingPeriodMonths: plan.billingPeriodMonths,
    feeRate: plan.feeRate,
    feeMinimum: plan.feeMinimum,
    limits: plan.limits,
    features: plan.features,
  };
}

export async function billingStatus(workspaceId: string) {
  const workspace = await loadWorkspacePlan(workspaceId);
  const entitlement = entitlementFor(workspace);
  const usage = await monthlyUsage(workspaceId);

  return {
    plan: entitlement.plan,
    label: planDefinition(entitlement.plan).label,
    lapsed: entitlement.lapsed,
    paidUntil: entitlement.paidUntil,
    feeRate: planDefinition(entitlement.plan).feeRate,
    feeMinimum: planDefinition(entitlement.plan).feeMinimum,
    limits: entitlement.limits,
    usage,
    renewsAt: entitlement.paidUntil,
    upgrade: { plan: 'pro', priceUsd: proAnnualPriceUsd(), months: renewalMonths() },
  };
}

export async function isPro(workspaceId: string): Promise<boolean> {
  return resolvePlan(await loadWorkspacePlan(workspaceId)) === 'pro';
}

export function listPublicPlans() {
  return allPlans().map((plan) => publicPlan(plan.name));
}
