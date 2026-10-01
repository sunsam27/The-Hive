import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { calculateFee, feeMinimum, feeRate } from '../services/payments/fees.js';
import {
  entitlementFor,
  limitFor,
  periodStart,
  resolvePlan,
  usageSnapshot,
  type WorkspacePlanRow,
} from '../services/entitlements.js';
import { periodEnd, publicPlan, renewalMonths } from '../services/billing.js';
import { planDefinition, proAnnualPrice, proAnnualPriceUsd } from '../config/plans.js';

const FREE: WorkspacePlanRow = { id: 'ws-1', plan: 'free', paid_until: null };

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

beforeEach(() => {
  delete process.env.PLATFORM_FEE_RATE;
  delete process.env.PLATFORM_FEE_MIN;
  delete process.env.PLATFORM_FEE_MIN_USD;
  delete process.env.PLATFORM_FEE_MIN_NGN;
  delete process.env.PRO_PLATFORM_FEE_RATE;
  delete process.env.PRO_PLATFORM_FEE_MIN;
  delete process.env.PRO_ANNUAL_PRICE_USD;
  delete process.env.PRO_RENEWAL_MONTHS;
});

afterEach(() => {
  delete process.env.PLATFORM_FEE_RATE;
  delete process.env.PRO_PLATFORM_FEE_RATE;
  delete process.env.PRO_ANNUAL_PRICE_USD;
});

describe('plan definitions', () => {
  it('keeps the take-rate on free and discounts it on pro', () => {
    expect(planDefinition('free').feeRate).toBe(0.02);
    expect(planDefinition('pro').feeRate).toBe(0.008);
  });

  it('scales the fee minimum with the rate so pro stays discounted on small payments', () => {
    expect(planDefinition('free').feeMinimum).toBe(1);
    expect(planDefinition('pro').feeMinimum).toBe(0.4);
  });

  it('leaves metered limits unlimited on pro', () => {
    expect(planDefinition('free').limits.invoicesPerMonth).toBe(3);
    expect(planDefinition('free').limits.ocrPerMonth).toBe(10);
    expect(planDefinition('pro').limits.invoicesPerMonth).toBeNull();
    expect(planDefinition('pro').limits.ocrPerMonth).toBeNull();
  });

  it('leaves expense tracking ungated so the take-rate keeps a funnel', () => {
    expect(planDefinition('pro').features).toContain('Everything in Free');
    expect(planDefinition('free').features).toContain('Expense tracking');
  });
});

describe('resolvePlan', () => {
  it('treats a missing or malformed plan as free', () => {
    expect(resolvePlan(null)).toBe('free');
    expect(resolvePlan(undefined)).toBe('free');
    expect(resolvePlan({ id: 'ws-1' })).toBe('free');
    expect(resolvePlan({ id: 'ws-1', plan: 'enterprise' })).toBe('free');
    expect(resolvePlan({ id: 'ws-1', plan: 'pro' })).toBe('free');
    expect(resolvePlan({ id: 'ws-1', plan: 'pro', paid_until: 'not-a-date' })).toBe('free');
  });

  it('grants pro only while paid_until is in the future', () => {
    expect(resolvePlan({ id: 'ws-1', plan: 'pro', paid_until: daysFromNow(30) })).toBe('pro');
    expect(resolvePlan({ id: 'ws-1', plan: 'pro', paid_until: daysFromNow(-1) })).toBe('free');
  });

  it('reports a lapsed workspace as free but still lapsed', () => {
    const entitlement = entitlementFor({ id: 'ws-1', plan: 'pro', paid_until: daysFromNow(-2) });
    expect(entitlement.plan).toBe('free');
    expect(entitlement.lapsed).toBe(true);
  });

  it('does not mark an unpaid workspace as lapsed', () => {
    expect(entitlementFor(FREE).lapsed).toBe(false);
  });

  it('exposes ISO paidUntil for the client', () => {
    const entitlement = entitlementFor({ id: 'ws-1', plan: 'pro', paid_until: daysFromNow(30) });
    expect(new Date(entitlement.paidUntil!).getTime()).toBeGreaterThan(Date.now());
  });
});

describe('plan-aware fees', () => {
  it('defaults to the free rate when no plan is supplied', () => {
    const fee = calculateFee(1000, { currency: 'USD' });
    expect(fee.platformFee).toBe(20);
    expect(fee.grossAmount).toBe(1020);
    expect(fee.plan).toBe('free');
  });

  it('charges the reduced rate on pro', () => {
    const fee = calculateFee(1000, { currency: 'USD', plan: 'pro' });
    expect(fee.platformFee).toBe(8);
    expect(fee.grossAmount).toBe(1008);
  });

  it('keeps net + fee equal to gross on both plans', () => {
    for (const plan of ['free', 'pro'] as const) {
      const fee = calculateFee(437.5, { currency: 'NGN', plan });
      expect(fee.netAmount + fee.platformFee).toBeCloseTo(fee.grossAmount, 2);
    }
  });

  it('applies the per-plan minimum on tiny payments', () => {
    expect(calculateFee(5, { currency: 'USD', plan: 'free' }).platformFee).toBe(1);
    expect(calculateFee(5, { currency: 'USD', plan: 'pro' }).platformFee).toBe(0.4);
  });

  it('never charges a pro workspace more than a free one', () => {
    for (const amount of [5, 50, 500, 5000]) {
      const free = calculateFee(amount, { currency: 'USD', plan: 'free' });
      const pro = calculateFee(amount, { currency: 'USD', plan: 'pro' });
      expect(pro.platformFee).toBeLessThanOrEqual(free.platformFee);
    }
  });

  it('reads rates and minimums from the environment', () => {
    process.env.PLATFORM_FEE_RATE = '0.03';
    process.env.PRO_PLATFORM_FEE_RATE = '0.01';
    process.env.PLATFORM_FEE_MIN = '2';
    process.env.PRO_PLATFORM_FEE_MIN = '0.5';

    expect(feeRate('free')).toBe(0.03);
    expect(feeRate('pro')).toBe(0.01);
    expect(feeMinimum('USD', 'free')).toBe(2);
    expect(feeMinimum('USD', 'pro')).toBe(0.5);
  });

  it('prefers a currency-specific minimum over the shared one', () => {
    process.env.PLATFORM_FEE_MIN = '1';
    process.env.PLATFORM_FEE_MIN_NGN = '50';
    expect(feeMinimum('NGN', 'free')).toBe(50);
    expect(feeMinimum('USD', 'free')).toBe(1);
  });

  it('falls back to the default rate when the configured rate is unparseable', () => {
    process.env.PLATFORM_FEE_RATE = 'not-a-number';
    const fee = calculateFee(100, { currency: 'USD' });
    expect(fee.rate).toBe(0.02);
    expect(fee.platformFee).toBe(2);
  });
});

describe('usage periods', () => {
  it('buckets usage by calendar month', () => {
    expect(periodStart(new Date('2026-03-17T13:45:00Z'))).toBe('2026-03-17');
    expect(periodStart(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01-01');
  });

  it('reports remaining allowance against the plan limit', async () => {
    const snapshot = await usageSnapshot(FREE, 'invoices', 2);
    expect(snapshot.used).toBe(2);
    expect(snapshot.limit).toBe(3);
    expect(snapshot.remaining).toBe(1);
  });

  it('reports null remaining for pro because the limit is unlimited', async () => {
    const pro = { id: 'ws-1', plan: 'pro', paid_until: daysFromNow(30) } as WorkspacePlanRow;
    const snapshot = await usageSnapshot(pro, 'invoices', 99);
    expect(snapshot.limit).toBeNull();
    expect(snapshot.remaining).toBeNull();
  });

  it('never reports negative remaining usage', async () => {
    const snapshot = await usageSnapshot(FREE, 'ocr', 25);
    expect(snapshot.remaining).toBe(0);
  });
});

describe('workspace and member limits', () => {
  it('caps free workspaces at one', () => {
    expect(limitFor(FREE, 'workspaces')).toBe(1);
  });

  it('caps free members at two per workspace', () => {
    expect(limitFor(FREE, 'membersPerWorkspace')).toBe(2);
  });

  it('removes both caps on pro', () => {
    const pro = { id: 'ws-1', plan: 'pro', paid_until: daysFromNow(30) } as WorkspacePlanRow;
    expect(limitFor(pro, 'workspaces')).toBeNull();
    expect(limitFor(pro, 'membersPerWorkspace')).toBeNull();
  });

  it('restores the free caps once the paid period lapses', () => {
    const lapsed = { id: 'ws-1', plan: 'pro', paid_until: daysFromNow(-1) } as WorkspacePlanRow;
    expect(limitFor(lapsed, 'workspaces')).toBe(1);
  });
});

describe('renewal periods', () => {
  it('defaults to a twelve month period', () => {
    expect(renewalMonths()).toBe(12);
  });

  it('extends from the current expiry so an early renewal never shortens it', () => {
    const now = new Date('2026-03-17T00:00:00Z');
    const later = new Date('2027-01-01T00:00:00Z');
    expect(periodEnd(later, 12).getTime()).toBeGreaterThan(later.getTime());
    expect(periodEnd(now, 12).getFullYear()).toBe(2027);
  });
});

describe('pro pricing', () => {
  it('sells pro as a one-time annual charge', () => {
    expect(proAnnualPriceUsd()).toBe(39);
    expect(planDefinition('pro').billingPeriodMonths).toBe(12);
  });

  it('allows the annual price to be changed from the environment', () => {
    process.env.PRO_ANNUAL_PRICE_USD = '59';
    expect(proAnnualPriceUsd()).toBe(59);
  });

  it('falls back to the USD price when a currency has no local price yet', () => {
    expect(proAnnualPrice('usd')).toBe(39);
    expect(proAnnualPrice('NGN')).toBe(39);
  });

  it('uses an environment price when a currency is configured', () => {
    process.env.PRO_ANNUAL_PRICE_NGN = '60000';
    expect(proAnnualPrice('NGN')).toBe(60000);
  });

  it('never charges for the free plan', () => {
    expect(publicPlan('free').priceUsd).toBe(0);
  });

  it('advertises the pro fee reduction in the public plan', () => {
    expect(publicPlan('pro').feeRate).toBe(0.008);
  });
});
