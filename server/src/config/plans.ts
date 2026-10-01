import { numberFromEnv, stringFromEnv } from '../utils/env.js';

export type PlanName = 'free' | 'pro';

/** Metered actions tracked per workspace per calendar month. */
export type UsageMetric = 'invoices' | 'ocr';

export interface PlanLimits {
  /** null = unlimited */
  workspaces: number | null;
  membersPerWorkspace: number | null;
  invoicesPerMonth: number | null;
  ocrPerMonth: number | null;
  /** null = keep forever */
  auditLogRetentionDays: number | null;
}

export interface PlanDefinition {
  name: PlanName;
  label: string;
  /** Share of the payment taken by the platform, as a fraction. */
  feeRate: number;
  /** Floor applied to the platform fee, so tiny payments are not charged a large percentage. */
  feeMinimum: number;
  annualPriceUsd: number;
  billingPeriodMonths: number;
  limits: PlanLimits;
  features: string[];
}

const FREE_LIMITS: PlanLimits = {
  workspaces: 1,
  membersPerWorkspace: 2,
  invoicesPerMonth: 3,
  ocrPerMonth: 10,
  auditLogRetentionDays: 7,
};

const PRO_LIMITS: PlanLimits = {
  workspaces: null,
  membersPerWorkspace: null,
  invoicesPerMonth: null,
  ocrPerMonth: null,
  auditLogRetentionDays: null,
};

const FREE_PLAN: PlanDefinition = {
  name: 'free',
  label: 'Free',
  feeRate: 0.02,
  feeMinimum: 1,
  annualPriceUsd: 0,
  billingPeriodMonths: 0,
  limits: FREE_LIMITS,
  features: [
    'Expense tracking',
    '1 workspace',
    '2 members per workspace',
    '3 invoices per month',
    '10 receipt scans per month',
    '7-day audit log',
  ],
};

const PRO_PLAN: PlanDefinition = {
  name: 'pro',
  label: 'Pro',
  feeRate: 0.008,
  feeMinimum: 0.4,
  annualPriceUsd: 39,
  billingPeriodMonths: 12,
  limits: PRO_LIMITS,
  features: [
    'Everything in Free',
    'Unlimited workspaces and members',
    'Unlimited invoices and receipt scans',
    'Full audit log history',
    'Reports and summaries',
    'Reduced platform fee (2% to 0.8%)',
  ],
};

const PLANS: Record<PlanName, PlanDefinition> = { free: FREE_PLAN, pro: PRO_PLAN };

export function planDefinition(plan: PlanName): PlanDefinition {
  return PLANS[plan];
}

export function allPlans(): PlanDefinition[] {
  return Object.values(PLANS);
}

export function proAnnualPriceUsd(): number {
  return numberFromEnv('PRO_ANNUAL_PRICE_USD', PRO_PLAN.annualPriceUsd);
}

/**
 * The charge is one-time up front, so it must be priced per currency. Falling
 * back to the numeric USD amount would charge someone "39 NGN", so an
 * unconfigured currency is a hard error rather than a silent discount.
 */
export function proAnnualPrice(currency: string = 'USD'): number | null {
  const normalized = String(currency || 'USD').toUpperCase();
  if (normalized === 'USD') return proAnnualPriceUsd();
  const override = process.env[`PRO_ANNUAL_PRICE_${normalized}`];
  if (override !== undefined) {
    const parsed = numberFromEnv(`PRO_ANNUAL_PRICE_${normalized}`, 0);
    return parsed > 0 ? parsed : null;
  }
  return null;
}

/** Currencies that can actually be charged right now, with their local amounts. */
export function availablePlanCurrencies(): { code: string; amount: number }[] {
  const out: { code: string; amount: number }[] = [];
  for (const code of PLAN_CURRENCY_CODES) {
    const amount = proAnnualPrice(code);
    if (amount !== null) out.push({ code, amount });
  }
  return out;
}

export const PLAN_CURRENCY_CODES = [
  'NGN',
  'GHS',
  'KES',
  'ZAR',
  'EGP',
  'USD',
  'GBP',
  'EUR',
] as const;

export function planNameFromEnv(): PlanName {
  return stringFromEnv('DEFAULT_PLAN', 'free') === 'pro' ? 'pro' : 'free';
}
