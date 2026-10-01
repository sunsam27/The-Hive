import { numberFromEnv } from '../../utils/env.js';
import { type PlanName, planDefinition } from '../../config/plans.js';

export interface FeeBreakdown {
  netAmount: number;
  platformFee: number;
  grossAmount: number;
  rate: number;
  minimum: number;
  plan: PlanName;
}

export interface FeeOptions {
  rate?: number;
  minimum?: number;
  currency?: string;
  plan?: PlanName;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function feeRate(plan: PlanName = 'free'): number {
  return numberFromEnv(plan === 'pro' ? 'PRO_PLATFORM_FEE_RATE' : 'PLATFORM_FEE_RATE', planDefinition(plan).feeRate);
}

export function feeMinimum(currency: string = 'USD', plan: PlanName = 'free'): number {
  const normalized = String(currency || 'USD').toUpperCase();
  const prefix = plan === 'pro' ? 'PRO_PLATFORM_FEE_MIN' : 'PLATFORM_FEE_MIN';
  const specific = process.env[`${prefix}_${normalized}`];
  if (specific !== undefined) return numberFromEnv(`${prefix}_${normalized}`, planDefinition(plan).feeMinimum);
  return numberFromEnv(prefix, planDefinition(plan).feeMinimum);
}

export function calculateFee(netAmount: number, options: FeeOptions = {}): FeeBreakdown {
  const currency = options.currency ?? 'USD';
  const plan = options.plan ?? 'free';
  const rate = options.rate ?? feeRate(plan);
  const minimum = options.minimum ?? feeMinimum(currency, plan);

  const base = round2(Number(netAmount));
  const fee = round2(Math.max(base * rate, minimum));

  return {
    netAmount: base,
    platformFee: fee,
    grossAmount: round2(base + fee),
    rate,
    minimum,
    plan,
  };
}
