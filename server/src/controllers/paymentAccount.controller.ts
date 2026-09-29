import { Request, Response, NextFunction } from 'express';
import db from '../db/index.js';
import { logAudit } from '../utils/auditLog.js';
import {
  FLUTTERWAVE,
  FLW_PROCESSING_FEE_DISCLOSURE,
  PaymentAccountError,
  STRIPE,
  createFlutterwaveSubaccount,
  createStripeOnboarding,
  listAccounts,
  refreshStripeAccount,
  unlinkAccount,
} from '../services/payments/accounts.js';

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';

function body(req: Request): Record<string, unknown> {
  const value = req.body;
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function requiredString(value: unknown, field: string): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) throw new PaymentAccountError(`${field} is required`, 400);
  return normalized;
}

function onboardingUrls(req: Request): { returnUrl: string; refreshUrl: string } {
  const base = String(body(req).returnUrl || FRONTEND_URL).replace(/\/+$/, '');
  return {
    returnUrl: `${base}/settings/payouts?stripe_onboarding=return`,
    refreshUrl: `${base}/settings/payouts?stripe_onboarding=refresh`,
  };
}

export async function getAccounts(req: Request, res: Response, next: NextFunction) {
  try {
    const accounts = await listAccounts(req.user!.id);

    res.json({
      accounts,
      disclosures: {
        [STRIPE]: 'Payouts land in your Stripe account, so you receive the expense amount in full.',
        [FLUTTERWAVE]: FLW_PROCESSING_FEE_DISCLOSURE,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function startStripeOnboarding(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await db('users').where({ id: req.user!.id }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const email = requiredString(body(req).email ?? user.email, 'email');
    const { returnUrl, refreshUrl } = onboardingUrls(req);

    const result = await createStripeOnboarding(req.user!.id, { email, returnUrl, refreshUrl });

    await logAudit(db, req.user!.id, 'payment_account.stripe_onboarding', 'payment_account', null, {
      status: result.status,
      reused: result.alreadyOnboarded,
    });

    res.json({ ...result, returnUrl, refreshUrl });
  } catch (err) {
    next(err);
  }
}

export async function syncStripeAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const account = await refreshStripeAccount(req.user!.id);

    if (!account) {
      return res.status(404).json({ error: 'No Stripe account is linked to your profile' });
    }

    await logAudit(db, req.user!.id, 'payment_account.stripe_synced', 'payment_account', null, {
      status: account.status,
    });

    res.json({ account });
  } catch (err) {
    next(err);
  }
}

export async function addFlutterwaveSubaccount(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = body(req);

    const account = await createFlutterwaveSubaccount(req.user!.id, {
      accountBank: requiredString(payload.accountBank, 'Account bank'),
      accountNumber: requiredString(payload.accountNumber, 'Account number'),
      businessName: requiredString(payload.businessName, 'Business name'),
      country: requiredString(payload.country, 'Country'),
      businessMobile: requiredString(payload.businessMobile, 'Business phone'),
      meta: Array.isArray(payload.meta) ? (payload.meta as unknown[]) : undefined,
    });

    await logAudit(db, req.user!.id, 'payment_account.flutterwave_added', 'payment_account', null, {
      status: account.status,
    });

    res.status(201).json({ account, disclosure: FLW_PROCESSING_FEE_DISCLOSURE });
  } catch (err) {
    next(err);
  }
}

export async function removeAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const { provider } = req.params as { provider: string };

    const removed = await unlinkAccount(req.user!.id, provider);
    if (!removed) {
      return res.status(404).json({ error: `No ${provider} account is linked to your profile` });
    }

    await logAudit(db, req.user!.id, 'payment_account.removed', 'payment_account', null, {
      provider,
    });

    res.json({ message: `${provider} account unlinked` });
  } catch (err) {
    next(err);
  }
}
