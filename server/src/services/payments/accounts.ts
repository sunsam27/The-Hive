import type Stripe from 'stripe';
import db from '../../db/index.js';
import { feeRate } from './fees.js';
import { getStripeClient, mapStripeAccountStatus } from './stripe.provider.js';
import type { AccountStatus, AccountUpdatePayload } from './types.js';

const FLW_API = 'https://api.flutterwave.com/v3';

export const STRIPE = 'stripe';
export const FLUTTERWAVE = 'flutterwave';

export const FLW_PROCESSING_FEE_DISCLOSURE =
  'Flutterwave deducts its own processing fee from the amount sent to your bank account, so you receive slightly less than the expense amount. Stripe payouts are not affected.';

export class PaymentAccountError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'PaymentAccountError';
    this.status = status;
  }
}

interface PaymentAccountRow {
  id: string;
  user_id: string;
  provider: string;
  provider_account_id: string;
  status: string;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  business_name: string | null;
  display_label: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentAccountSummary {
  provider: string;
  status: AccountStatus;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  canReceiveSplits: boolean;
  businessName: string | null;
  displayLabel: string | null;
  lastFour: string | null;
  updatedAt: string;
}

export interface StripeOnboardingInput {
  email: string;
  returnUrl: string;
  refreshUrl: string;
}

export interface StripeOnboardingResult extends PaymentAccountSummary {
  onboardingUrl: string;
  alreadyOnboarded: boolean;
}

export interface FlutterwaveSubaccountInput {
  accountBank: string;
  accountNumber: string;
  businessName: string;
  country: string;
  businessMobile: string;
  splitType?: 'percentage' | 'flat';
  splitValue?: number;
  meta?: unknown[];
}

function toSummary(row: PaymentAccountRow): PaymentAccountSummary {
  const status = row.status as AccountStatus;
  const lastFour =
    row.meta && typeof row.meta.account_last4 === 'string' ? row.meta.account_last4 : null;

  return {
    provider: row.provider,
    status,
    detailsSubmitted: row.details_submitted,
    chargesEnabled: row.charges_enabled,
    payoutsEnabled: row.payouts_enabled,
    canReceiveSplits: status === 'active' && row.payouts_enabled,
    businessName: row.business_name,
    displayLabel: row.display_label,
    lastFour,
    updatedAt: row.updated_at,
  };
}

function normalizeProvider(provider: string): string {
  const normalized = String(provider || '').toLowerCase();
  if (normalized !== STRIPE && normalized !== FLUTTERWAVE) {
    throw new PaymentAccountError(`Unknown payment provider: ${provider}`, 400);
  }
  return normalized;
}

export async function findAccountForProvider(
  userId: string,
  provider: string
): Promise<PaymentAccountRow | undefined> {
  return db('payment_accounts')
    .where({ user_id: userId, provider: normalizeProvider(provider) })
    .first();
}

export async function listAccounts(userId: string): Promise<PaymentAccountSummary[]> {
  const rows = await db('payment_accounts')
    .where({ user_id: userId })
    .orderBy('provider', 'asc');

  return (rows as PaymentAccountRow[]).map(toSummary);
}

export function isAccountEligibleForSplits(row: {
  status?: string | null;
  payouts_enabled?: boolean | null;
  provider_account_id?: string | null;
} | null | undefined): boolean {
  if (!row) return false;
  if (row.status !== 'active') return false;
  if (!row.payouts_enabled) return false;
  return Boolean(row.provider_account_id);
}

export async function resolveSplitAccountId(
  userId: string | null,
  provider: string
): Promise<string | null> {
  if (!userId) return null;

  const row = await db('payment_accounts')
    .where({ user_id: userId, provider: normalizeProvider(provider), status: 'active', payouts_enabled: true })
    .first();

  return isAccountEligibleForSplits(row) ? row!.provider_account_id : null;
}

async function upsertAccount(values: {
  userId: string;
  provider: string;
  providerAccountId: string;
  status: AccountStatus;
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  businessName?: string | null;
  displayLabel?: string | null;
  meta?: Record<string, unknown> | null;
}): Promise<PaymentAccountRow> {
  const payload = {
    provider: values.provider,
    provider_account_id: values.providerAccountId,
    status: values.status,
    details_submitted: values.detailsSubmitted,
    charges_enabled: values.chargesEnabled,
    payouts_enabled: values.payoutsEnabled,
    business_name: values.businessName ?? null,
    display_label: values.displayLabel ?? null,
    meta: values.meta ?? db.raw('COALESCE(meta, \'{}\'::jsonb)'),
    updated_at: db.fn.now(),
  };

  const [row] = await db('payment_accounts')
    .insert({ user_id: values.userId, ...payload, created_at: db.fn.now() })
    .onConflict(['user_id', 'provider'])
    .merge(payload)
    .returning('*');

  return row as PaymentAccountRow;
}

function stripeAccountToValues(userId: string, account: Stripe.Account) {
  return {
    userId,
    provider: STRIPE,
    providerAccountId: account.id,
    status: mapStripeAccountStatus(account),
    detailsSubmitted: Boolean(account.details_submitted),
    chargesEnabled: Boolean(account.charges_enabled),
    payoutsEnabled: Boolean(account.payouts_enabled),
    businessName: account.business_profile?.name ?? null,
    displayLabel: account.settings?.dashboard.display_name ?? account.email ?? null,
    meta: { email: account.email ?? null } as Record<string, unknown> | null,
  };
}

export async function createStripeOnboarding(
  userId: string,
  input: StripeOnboardingInput
): Promise<StripeOnboardingResult> {
  const stripe = getStripeClient();
  const existing = await findAccountForProvider(userId, STRIPE);

  let account: Stripe.Account | null = null;
  let reused = false;

  if (existing) {
    try {
      account = await stripe.accounts.retrieve(existing.provider_account_id);
      reused = true;
    } catch {
      await db('payment_accounts').where({ id: existing.id }).del();
    }
  }

  if (!account) {
    account = await stripe.accounts.create(
      {
        type: 'express',
        email: input.email,
        capabilities: { transfers: { requested: true } },
      },
      { idempotencyKey: `connect-express-account-${userId}` }
    );
  }

  const saved = await upsertAccount(stripeAccountToValues(userId, account));

  const link = await stripe.accountLinks.create({
    account: account.id,
    type: 'account_onboarding',
    return_url: input.returnUrl,
    refresh_url: input.refreshUrl,
  });

  return { ...toSummary(saved), onboardingUrl: link.url, alreadyOnboarded: reused && saved.status === 'active' };
}

export async function refreshStripeAccount(userId: string): Promise<PaymentAccountSummary | null> {
  const existing = await findAccountForProvider(userId, STRIPE);
  if (!existing) return null;

  const stripe = getStripeClient();

  let account: Stripe.Account;
  try {
    account = await stripe.accounts.retrieve(existing.provider_account_id);
  } catch {
    return toSummary(existing);
  }

  const saved = await upsertAccount(stripeAccountToValues(userId, account));
  return toSummary(saved);
}

interface FlutterwaveSubaccountResponse {
  status?: string;
  message?: string;
  data?: {
    subaccount_id?: string;
    account_number?: string;
    account_bank?: string;
    bank_name?: string;
    split_type?: string;
    split_value?: number;
  } | null;
}

export async function createFlutterwaveSubaccount(
  userId: string,
  input: FlutterwaveSubaccountInput
): Promise<PaymentAccountSummary> {
  const secretKey = process.env.FLW_SECRET_KEY;
  if (!secretKey) {
    throw new PaymentAccountError('Flutterwave is not configured on this environment', 503);
  }

  const existing = await findAccountForProvider(userId, FLUTTERWAVE);
  if (existing) {
    throw new PaymentAccountError(
      'You already have a Flutterwave subaccount. Remove it before adding another.',
      409
    );
  }

  // Flutterwave requires all of these on POST /v3/subaccounts. Validate locally so
  // a missing field is a clear 400 instead of an opaque 502 from the provider.
  const fields = {
    accountBank: String(input.accountBank || '').trim(),
    accountNumber: String(input.accountNumber || '').trim(),
    businessName: String(input.businessName || '').trim(),
    country: String(input.country || '').trim().toUpperCase(),
    businessMobile: String(input.businessMobile || '').trim(),
  };

  const labels: Record<keyof typeof fields, string> = {
    accountBank: 'Bank code',
    accountNumber: 'Account number',
    businessName: 'Business name',
    country: 'Country',
    businessMobile: 'Business phone',
  };

  for (const key of Object.keys(fields) as Array<keyof typeof fields>) {
    if (!fields[key]) {
      throw new PaymentAccountError(`${labels[key]} is required`, 400);
    }
  }

  const splitType = input.splitType ?? 'percentage';
  const splitValue = input.splitValue ?? feeRate();

  const res = await fetch(`${FLW_API}/subaccounts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      account_bank: fields.accountBank,
      account_number: fields.accountNumber,
      business_name: fields.businessName,
      country: fields.country,
      business_mobile: fields.businessMobile,
      split_type: splitType,
      split_value: splitValue,
      ...(input.meta ? { meta: input.meta } : {}),
    }),
  });

  const json = (await res.json()) as FlutterwaveSubaccountResponse;

  if (json.status !== 'success' || !json.data?.subaccount_id) {
    const message = json.message || 'Flutterwave rejected the subaccount';
    if (/already exists/i.test(message)) {
      throw new PaymentAccountError(
        'Flutterwave already has a subaccount for that bank account and number.',
        409
      );
    }
    throw new PaymentAccountError(message, 502);
  }

  const lastFour = fields.accountNumber.slice(-4);

  const saved = await upsertAccount({
    userId,
    provider: FLUTTERWAVE,
    providerAccountId: json.data.subaccount_id,
    status: 'active',
    detailsSubmitted: true,
    chargesEnabled: true,
    payoutsEnabled: true,
    businessName: fields.businessName,
    displayLabel: `${json.data.bank_name ?? fields.accountBank} ending ${lastFour}`,
    meta: {
      bank_name: json.data.bank_name ?? null,
      account_bank: json.data.account_bank ?? fields.accountBank,
      account_last4: lastFour,
      split_type: json.data.split_type ?? splitType,
      split_value: json.data.split_value ?? splitValue,
    },
  });

  return toSummary(saved);
}

export async function applyAccountUpdate(
  provider: string,
  update: AccountUpdatePayload
): Promise<boolean> {
  const affected = await db('payment_accounts')
    .where({ provider: normalizeProvider(provider), provider_account_id: update.providerAccountId })
    .update({
      status: update.status,
      details_submitted: update.detailsSubmitted,
      charges_enabled: update.chargesEnabled,
      payouts_enabled: update.payoutsEnabled,
      business_name: update.businessName,
      updated_at: db.fn.now(),
    });

  return affected > 0;
}

export async function unlinkAccount(userId: string, provider: string): Promise<boolean> {
  const deleted = await db('payment_accounts')
    .where({ user_id: userId, provider: normalizeProvider(provider) })
    .del();

  return deleted > 0;
}
