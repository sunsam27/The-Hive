import { Request, Response, NextFunction } from 'express';
import db from '../db/index.js';
import { checkWorkspaceAccess } from '../utils/accessControl.js';
import { logAudit } from '../utils/auditLog.js';
import {
  PaymentProviderUnavailableError,
  calculateFee,
  generatePlanReference,
  getProvider,
  isPlanReference,
  resolveProvider,
} from '../services/payments/index.js';
import type { FeeBreakdown } from '../services/payments/fees.js';
import type { PaymentProvider } from '../services/payments/types.js';
import { activatePlanPurchase, billingStatus, renewalMonths } from '../services/billing.js';
import { proAnnualPrice } from '../config/plans.js';

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';

/**
 * A webhook or verification result is only good enough to grant Pro if it paid
 * the amount and currency we asked for. Anything else is treated as
 * unconfirmed so a bad event can never hand out a plan for free.
 */
function paymentMatchesPurchase(
  txn: { amount?: number | null; currency?: string | null },
  purchase: { amount: number; currency: string }
): boolean {
  if (typeof txn.amount === 'number' && Math.abs(txn.amount - Number(purchase.amount)) > 0.01) {
    return false;
  }
  if (txn.currency && String(txn.currency).toUpperCase() !== String(purchase.currency).toUpperCase()) {
    return false;
  }
  return true;
}

function paymentAmounts(fee: FeeBreakdown) {
  return {
    netAmount: fee.netAmount,
    platformFee: fee.platformFee,
    grossAmount: fee.grossAmount,
  };
}

export async function initiateProPurchase(req: Request, res: Response, next: NextFunction) {
  try {
    const { workspaceId, currency: requestedCurrency } = req.body as {
      workspaceId: string;
      currency?: string;
    };

    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

    const workspace = await db('workspaces').where({ id: workspaceId }).first();
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

    const hasAccess = await checkWorkspaceAccess(workspaceId, req.user!.id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    if (workspace.owner_id !== req.user!.id) {
      return res.status(403).json({ error: 'Only the workspace owner can purchase Pro' });
    }

    const currency = String(requestedCurrency || 'USD').toUpperCase();
    const price = proAnnualPrice(currency);

    if (price === null) {
      return res.status(400).json({
        error: `Pro pricing is not configured for ${currency}. Configure PRO_ANNUAL_PRICE_${currency} or charge in USD.`,
      });
    }

    if (price <= 0) {
      return res.status(400).json({ error: 'Invalid Pro price configuration' });
    }

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

    const user = await db('users').where({ id: req.user!.id }).first();
    const reference = generatePlanReference(workspaceId);

    // The plan price is the whole charge. There is no split to take and no
    // take-rate on selling our own subscription, so gross must equal net.
    const fee = calculateFee(price, { currency, rate: 0, minimum: 0 });
    const description = `Pro annual plan — ${workspace.name}`;
    // The reference comes back on the return URL so the client can poll for
    // completion while the webhook is still in flight.
    const redirectUrl =
      `${FRONTEND_URL}/workspaces/${workspaceId}/billing` +
      `?payment_status=completed&reference=${encodeURIComponent(reference)}`;

    const session = await provider.createCheckout({
      reference,
      grossAmount: fee.grossAmount,
      netAmount: fee.netAmount,
      platformFee: fee.platformFee,
      currency,
      customerEmail: user?.email,
      customerName: user?.name,
      description,
      redirectUrl,
      destinationAccountId: null,
    });

    const purchaseId = (await db('plan_purchases').insert({
      workspace_id: workspaceId,
      purchaser_id: req.user!.id,
      provider: provider.name,
      provider_ref: reference,
      provider_transaction_id: session.providerSessionId,
      plan: 'pro',
      period_months: renewalMonths(),
      amount: price,
      currency,
      status: 'pending',
      meta: { checkoutUrl: session.checkoutUrl },
    })
      .returning('id')) as any;

    await logAudit(db, req.user!.id, 'plan.purchase_initiated', 'workspace', workspaceId, {
      provider: provider.name,
      reference,
      amount: price,
      currency,
    });

    res.json({
      paymentUrl: session.checkoutUrl,
      reference,
      status: 'pending',
      purchaseId: purchaseId[0]?.id || purchaseId,
      amount: price,
      ...paymentAmounts(fee),
    });
  } catch (err) {
    next(err);
  }
}

export async function completeProPurchase(req: Request, res: Response, next: NextFunction) {
  try {
    const { reference } = req.params as { reference: string };

    if (!isPlanReference(reference)) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    const purchase = await db('plan_purchases').where({ provider_ref: reference }).first();
    if (!purchase) return res.status(404).json({ error: 'Purchase not found' });

    const hasAccess = await checkWorkspaceAccess(purchase.workspace_id, req.user!.id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    if (purchase.status === 'completed') {
      const status = await billingStatus(purchase.workspace_id);
      return res.json({ status: 'completed', ...status });
    }

    const provider = getProvider(purchase.provider);
    if (provider?.isConfigured()) {
      try {
        const txn = await provider.verifyByReference(
          purchase.provider_ref,
          purchase.provider_transaction_id
        );
        if (txn.status === 'completed' && !paymentMatchesPurchase(txn, purchase)) {
          return res.status(409).json({
            error: 'Payment amount did not match the Pro price. Contact support.',
          });
        }
        if (txn.status === 'completed') {
          const activation = await activatePlanPurchase(purchase.id);
          await db('plan_purchases')
            .where({ id: purchase.id })
            .update({ provider_transaction_id: txn.transactionId || purchase.provider_transaction_id });
          await logAudit(db, req.user!.id, 'plan.purchase_completed', 'workspace', purchase.workspace_id, {
            reference,
          });
          const status = await billingStatus(activation.workspaceId);
          // billingStatus already reports paidUntil as an ISO string.
          return res.json({ status: 'completed', ...status });
        }
        if (txn.status === 'failed') {
          await db('plan_purchases').where({ id: purchase.id }).update({ status: 'failed' });
          return res.json({ status: 'failed' });
        }
      } catch {}
    }

    const workspace = await db('workspaces').where({ id: purchase.workspace_id }).first();
    const paidUntil = workspace?.paid_until ? new Date(workspace.paid_until) : null;
    res.json({
      status: purchase.status,
      paidUntil: paidUntil && !Number.isNaN(paidUntil.getTime()) ? paidUntil.toISOString() : null,
    });
  } catch (err) {
    next(err);
  }
}
