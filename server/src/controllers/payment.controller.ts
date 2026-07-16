import { Request, Response, NextFunction } from 'express';
import db from '../db/index.js';
import { checkWorkspaceAccess } from '../utils/accessControl.js';
import { logAudit } from '../utils/auditLog.js';
import { initiatePayment, verifyTransaction, generateTxRef, getFlwSecretHash } from '../services/flutterwave.service.js';

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';

export async function initiate(req: Request, res: Response, next: NextFunction) {
  try {
    const { expenseId } = req.body as { expenseId: string };

    if (!process.env.FLW_PUBLIC_KEY || !process.env.FLW_SECRET_KEY) {
      return res.status(503).json({ error: 'Payment service is not configured' });
    }

    const expense = await db('expenses').where({ id: expenseId }).first();
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    const hasAccess = await checkWorkspaceAccess(expense.workspace_id, req.user!.id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    if (expense.status !== 'approved') {
      return res.status(400).json({ error: 'Only approved expenses can be paid' });
    }

    const existingPayment = await db('payments')
      .where({ expense_id: expenseId, status: 'pending' })
      .first();
    if (existingPayment) {
      return res.json({ paymentUrl: existingPayment.flutterwave_tx_ref, existing: true });
    }

    const user = await db('users').where({ id: req.user!.id }).first();
    const txRef = generateTxRef(expenseId);

    const paymentResult = await initiatePayment({
      txRef,
      amount: parseFloat(expense.amount),
      currency: expense.currency || 'USD',
      customerEmail: user.email,
      customerName: user.name,
      redirectUrl: `${FRONTEND_URL}/expenses/${expenseId}?payment_status=completed`,
    });

    await db('payments').insert({
      expense_id: expenseId,
      workspace_id: expense.workspace_id,
      payer_id: req.user!.id,
      amount: expense.amount,
      currency: expense.currency || 'USD',
      status: 'pending',
      flutterwave_tx_ref: txRef,
    });

    await logAudit(db, req.user!.id, 'payment.initiated', 'payment', expenseId, { txRef });

    res.json({
      paymentUrl: paymentResult.data?.link || paymentResult.data?.redirect_url,
      txRef,
      status: 'pending',
    });
  } catch (err) {
    next(err);
  }
}

export async function verify(req: Request, res: Response, next: NextFunction) {
  try {
    const { txRef } = req.params as { txRef: string };

    const payment = await db('payments').where({ flutterwave_tx_ref: txRef }).first();
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const hasAccess = await checkWorkspaceAccess(payment.workspace_id, req.user!.id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    if (payment.status === 'completed') {
      return res.json({ status: 'completed', paidAt: payment.paid_at });
    }

    res.json({ status: payment.status });
  } catch (err) {
    next(err);
  }
}

export async function handleWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    const event = req.body;

    if (event.event === 'charge.completed' && event.data?.tx_ref) {
      const txRef = event.data.tx_ref;
      const transactionId = String(event.data.id);

      const payment = await db('payments').where({ flutterwave_tx_ref: txRef }).first();
      if (!payment) return res.status(404).json({ error: 'Payment not found' });

      if (payment.status === 'completed') {
        return res.json({ message: 'Already processed' });
      }

      await db.transaction(async (trx: any) => {
        await trx('payments')
          .where({ id: payment.id })
          .update({
            status: 'completed',
            flutterwave_transaction_id: transactionId,
            paid_at: new Date(),
          });

        await trx('expenses')
          .where({ id: payment.expense_id })
          .update({ status: 'paid' });

        await logAudit(trx, payment.payer_id, 'payment.completed', 'expense', payment.expense_id, { txRef, transactionId });
      });
    }

    res.json({ message: 'Webhook received' });
  } catch (err) {
    next(err);
  }
}
