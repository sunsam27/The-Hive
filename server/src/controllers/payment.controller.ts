import { Request, Response, NextFunction } from 'express';
import db from '../db/index.js';
import { checkWorkspaceAccess } from '../utils/accessControl.js';
import { logAudit } from '../utils/auditLog.js';
import {
  PaymentProviderUnavailableError,
  calculateFee,
  generatePaymentReference,
  getProvider,
  isPlanReference,
  resolveProvider,
  webhookSecretVar,
} from '../services/payments/index.js';
import type { FeeBreakdown } from '../services/payments/fees.js';
import type {
  PaymentProvider,
  ProviderTransaction,
  WebhookEvent,
  WebhookRequestLike,
} from '../services/payments/types.js';
import { applyAccountUpdate, resolveSplitAccountId } from '../services/payments/accounts.js';
import { resolvePlan } from '../services/entitlements.js';
import { activatePlanPurchase } from '../services/billing.js';

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';

function getRawBody(req: Request): string | null {
  const raw = (req as Request & { rawBody?: string }).rawBody;
  return typeof raw === 'string' ? raw : null;
}

function buildWebhookRequest(req: Request): WebhookRequestLike {
  return {
    body: req.body,
    rawBody: getRawBody(req),
    headers: req.headers as Record<string, string | string[] | undefined>,
  };
}

function paymentAmounts(fee: FeeBreakdown) {
  return {
    netAmount: fee.netAmount,
    platformFee: fee.platformFee,
    grossAmount: fee.grossAmount,
  };
}

/**
 * Guards against a webhook that settles a different amount or currency than we
 * charged for, which would otherwise hand out a Pro period for free.
 */
export function planPaymentMatches(
  event: WebhookEvent,
  purchase: { amount: number; currency: string }
): boolean {
  // Fail closed. A missing or non-numeric amount is not a match: without this,
  // a provider event that omits the total would silently grant Pro. Number.isFinite
  // also catches NaN, which would otherwise slip through the comparison below.
  if (typeof event.amount !== 'number' || !Number.isFinite(event.amount)) return false;
  const currency = event.currency ? String(event.currency).toUpperCase() : '';
  if (!currency) return false;

  if (Math.abs(event.amount - Number(purchase.amount)) > 0.01) return false;
  if (currency !== String(purchase.currency).toUpperCase()) return false;
  return true;
}

/** SQLite returns JSON columns as strings, Postgres as objects. Normalise both. */
function asMetaObject(meta: unknown): Record<string, unknown> {
  if (meta && typeof meta === 'object') return meta as Record<string, unknown>;
  if (typeof meta === 'string') {
    try {
      const parsed = JSON.parse(meta);
      if (parsed && typeof parsed === 'object') return parsed as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

async function resolveRecipient(expense: any, provider: PaymentProvider) {
  if (!expense.submitter_id) {
    return { accountId: null, split: 'missing_submitter' as const };
  }

  const accountId = await resolveSplitAccountId(expense.submitter_id, provider.name);

  if (!accountId) {
    console.warn(
      `[payments] Expense ${expense.id}: submitter has no active ${provider.name} account. ` +
        `The full amount will land on the platform account and the freelancer must be paid out manually.`
    );
  }

  return { accountId, split: (accountId ? 'provider_split' : 'manual_payout') as string };
}

async function completePayment(
  payment: any,
  provider: PaymentProvider,
  transactionId: string | null,
  paidAt: Date | null
) {
  await db.transaction(async (trx: any) => {
    await trx('payments')
      .where({ id: payment.id })
      .update({
        status: 'completed',
        provider_transaction_id: transactionId,
        paid_at: paidAt || new Date(),
      });

    await trx('expenses')
      .where({ id: payment.expense_id })
      .update({ status: 'paid' });

    await logAudit(
      trx,
      payment.payer_id,
      'payment.completed',
      'expense',
      payment.expense_id,
      { provider: provider.name, transactionId }
    );
  });
}

export async function initiate(req: Request, res: Response, next: NextFunction) {
  try {
    const { expenseId } = req.body as { expenseId: string };

    const expense = await db('expenses').where({ id: expenseId }).first();
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    const hasAccess = await checkWorkspaceAccess(expense.workspace_id, req.user!.id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    if (expense.status !== 'approved') {
      return res.status(400).json({ error: 'Only approved expenses can be paid' });
    }

    const currency = String(expense.currency || 'USD').toUpperCase();

    let provider: PaymentProvider;
    try {
      provider = resolveProvider(currency);
    } catch (err) {
      if (err instanceof PaymentProviderUnavailableError) {
        return res.status(400).json({ error: `No payment provider available for ${currency}` });
      }
      throw err;
    }

    if (!provider.isConfigured()) {
      return res.status(503).json({ error: 'Payment service is not configured' });
    }

    const existingPayment = await db('payments')
      .where({ expense_id: expenseId, status: 'pending' })
      .first();

    if (existingPayment?.checkout_url) {
      return res.json({
        paymentUrl: existingPayment.checkout_url,
        txRef: existingPayment.provider_ref,
        status: 'pending',
        existing: true,
      });
    }

    const user = await db('users').where({ id: req.user!.id }).first();
    const reference = generatePaymentReference(expenseId);

    const workspace = await db('workspaces').where({ id: expense.workspace_id }).first();
    const fee = calculateFee(parseFloat(expense.amount), { currency, plan: resolvePlan(workspace) });
    const recipient = await resolveRecipient(expense, provider);
    const description = expense.description
      ? `Expense: ${String(expense.description).slice(0, 120)}`
      : `Expense ${expenseId}`;

    const session = await provider.createCheckout({
      reference,
      grossAmount: fee.grossAmount,
      netAmount: fee.netAmount,
      platformFee: fee.platformFee,
      currency,
      customerEmail: user.email,
      customerName: user.name,
      description,
      redirectUrl: `${FRONTEND_URL}/expenses/${expenseId}?payment_status=completed`,
      destinationAccountId: recipient.accountId,
    });

    if (existingPayment) {
      await db('payments')
        .where({ id: existingPayment.id })
        .update({
          provider: provider.name,
          provider_ref: reference,
          provider_session_id: session.providerSessionId,
          checkout_url: session.checkoutUrl,
          gross_amount: fee.grossAmount,
          platform_fee: fee.platformFee,
        });

      return res.json({
        paymentUrl: session.checkoutUrl,
        txRef: reference,
        status: 'pending',
        existing: true,
        split: recipient.split,
        ...paymentAmounts(fee),
      });
    }

    await db('payments').insert({
      expense_id: expenseId,
      workspace_id: expense.workspace_id,
      payer_id: req.user!.id,
      provider: provider.name,
      provider_ref: reference,
      provider_session_id: session.providerSessionId,
      checkout_url: session.checkoutUrl,
      amount: expense.amount,
      gross_amount: fee.grossAmount,
      platform_fee: fee.platformFee,
      currency,
      status: 'pending',
    });

    await logAudit(db, req.user!.id, 'payment.initiated', 'payment', expenseId, {
      provider: provider.name,
      reference,
      platformFee: fee.platformFee,
      split: recipient.split,
    });

    res.json({
      paymentUrl: session.checkoutUrl,
      status: 'pending',
      split: recipient.split,
      ...paymentAmounts(fee),
    });
  } catch (err) {
    next(err);
  }
}

export async function verify(req: Request, res: Response, next: NextFunction) {
  try {
    const { reference } = req.params as { reference: string };

    const payment = await db('payments').where({ provider_ref: reference }).first();
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const hasAccess = await checkWorkspaceAccess(payment.workspace_id, req.user!.id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    if (payment.status === 'completed') {
      return res.json({ status: 'completed', paidAt: payment.paid_at });
    }

    const provider = getProvider(payment.provider);
    if (provider?.isConfigured()) {
      let transaction: ProviderTransaction | null = null;
      try {
        transaction = await provider.verifyByReference(
          payment.provider_ref,
          payment.provider_session_id
        );
      } catch {
        transaction = null;
      }

      if (transaction?.status === 'completed') {
        await completePayment(payment, provider, transaction.transactionId, transaction.paidAt);
        return res.json({ status: 'completed', paidAt: transaction.paidAt || new Date() });
      }

      if (transaction?.status === 'failed') {
        return res.json({ status: 'failed' });
      }
    }

    res.json({ status: payment.status });
  } catch (err) {
    next(err);
  }
}

export async function handleWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const { provider: providerName } = req.params as { provider: string };

    const provider = getProvider(providerName);
    if (!provider) return res.status(404).json({ error: 'Unknown payment provider' });

    const webhookRequest = buildWebhookRequest(req);
    if (!provider.verifySignature(webhookRequest)) {
      console.warn(
        `[payments] Rejected ${provider.name} webhook: signature verification failed. ` +
          `Ensure ${webhookSecretVar(provider.name)} matches the value in the ${provider.name} dashboard.`
      );
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const event = provider.parseWebhook(webhookRequest);
    if (event.type === 'ignored') {
      return res.json({ message: 'Webhook received' });
    }

    if (event.type === 'account.updated' && event.accountUpdate) {
      const applied = await applyAccountUpdate(provider.name, event.accountUpdate);
      return res.json({
        message: applied ? 'Connected account updated' : 'Connected account not tracked',
        tracked: applied,
      });
    }

    if (!event.reference) {
      return res.status(400).json({ error: 'Webhook missing payment reference' });
    }

    // A Pro purchase is money coming in, not an expense reimbursement, so it is
    // matched against plan_purchases by its PRO-namespaced reference and grants
    // the paid period rather than marking an expense paid.
    if (isPlanReference(event.reference)) {
      const planPurchase = await db('plan_purchases')
        .where({ provider: provider.name, provider_ref: event.reference })
        .first();

      if (planPurchase) {
        if (planPurchase.status === 'completed') {
          return res.json({ message: 'Already processed' });
        }

        if (event.type === 'payment.failed') {
          await db('plan_purchases').where({ id: planPurchase.id }).update({ status: 'failed' });
          return res.json({ message: 'Plan purchase marked failed' });
        }

        await db('plan_purchases')
          .where({ id: planPurchase.id })
          .update({ provider_transaction_id: event.transactionId });

        // Only grant the period if the provider says the right money arrived.
        if (!planPaymentMatches(event, planPurchase)) {
          // Loud, because failing closed also rejects a legitimate payment whose
          // provider payload simply carried no amount. Without this log that
          // shows up as a paid customer with no Pro and no obvious cause.
          console.error(
            `[payments] Plan purchase ${planPurchase.id} rejected on amount/currency. ` +
            `received=${JSON.stringify({ amount: event.amount, currency: event.currency })} ` +
            `expected=${planPurchase.amount} ${planPurchase.currency}`
          );
          await db('plan_purchases')
            .where({ id: planPurchase.id })
            .update({
              status: 'failed',
              // Merge rather than replace: meta also holds the checkout URL.
              meta: { ...asMetaObject(planPurchase.meta), reason: 'amount_or_currency_mismatch' },
            });
          return res.status(400).json({ error: 'Plan payment amount did not match the Pro price' });
        }

        await activatePlanPurchase(planPurchase.id);
        await logAudit(db, planPurchase.purchaser_id, 'plan.purchase_completed', 'workspace', planPurchase.workspace_id, {
          provider: provider.name,
          reference: event.reference,
        });

        return res.json({ message: 'Plan purchase completed' });
      }
    }

    const payment = await db('payments')
      .where({ provider: provider.name, provider_ref: event.reference })
      .first();

    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status === 'completed') return res.json({ message: 'Already processed' });

    if (event.type === 'payment.failed') {
      await db('payments').where({ id: payment.id }).update({ status: 'failed' });
      return res.json({ message: 'Payment marked failed' });
    }

    await completePayment(payment, provider, event.transactionId, event.paidAt);

    res.json({ message: 'Webhook received' });
  } catch (err) {
    next(err);
  }
}
