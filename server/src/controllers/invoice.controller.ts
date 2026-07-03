import { Request, Response, NextFunction } from 'express';
import db from '../db/index.js';
import { checkWorkspaceAccess } from '../utils/accessControl.js';
import { logAudit } from '../utils/auditLog.js';
import { generateInvoiceNumber } from '../services/invoice.service.js';
import { generateInvoicePdf } from '../services/pdf.service.js';

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      workspaceId, serviceDesc, amount, currency, clientName,
      clientCompany, clientEmail, freelancerName, freelancerBusiness,
      freelancerContact, taxAmount, taxDesc, paymentTerms, notes,
    } = req.validated as any;

    const hasAccess = await checkWorkspaceAccess(workspaceId, req.user!.id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const invoiceNumber = await generateInvoiceNumber(db);

    const [invoice] = await db('invoices')
      .insert({
        workspace_id: workspaceId,
        created_by: req.user!.id,
        invoice_number: invoiceNumber,
        service_desc: serviceDesc,
        amount,
        currency: currency || 'USD',
        client_name: clientName,
        client_company: clientCompany,
        client_email: clientEmail,
        freelancer_name: freelancerName,
        freelancer_business: freelancerBusiness,
        freelancer_contact: freelancerContact,
        tax_amount: taxAmount || 0,
        tax_desc: taxDesc,
        payment_terms: paymentTerms,
        notes,
        status: 'draft',
      })
      .returning('*');

    await logAudit(db, req.user!.id, 'invoice.created', 'invoice', invoice.id, { workspaceId });

    res.status(201).json(invoice);
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const workspaceId = req.query.workspaceId as string | undefined;
    const status = req.query.status as string | undefined;

    let query = db('invoices')
      .join('workspace_members', 'invoices.workspace_id', 'workspace_members.workspace_id')
      .where('workspace_members.user_id', req.user!.id);

    if (workspaceId) query = query.where('invoices.workspace_id', workspaceId);
    if (status) query = query.where('invoices.status', status);

    const [{ count }] = await query.clone().count('invoices.id as count');

    const invoices = await query
      .clone()
      .select('invoices.*')
      .orderBy('invoices.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({ data: invoices, total: Number(count), page, limit });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const invoice = await db('invoices').where({ id }).first();
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const hasAccess = await checkWorkspaceAccess(invoice.workspace_id, req.user!.id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    res.json(invoice);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const invoice = await db('invoices').where({ id }).first();
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const hasAccess = await checkWorkspaceAccess(invoice.workspace_id, req.user!.id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    if (invoice.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft invoices can be edited' });
    }

    if (invoice.created_by !== req.user!.id) {
      return res.status(403).json({ error: 'Only the creator can edit this invoice' });
    }

    const allowedFields = [
      'service_desc', 'amount', 'currency', 'client_name', 'client_company',
      'client_email', 'freelancer_name', 'freelancer_business', 'freelancer_contact',
      'tax_amount', 'tax_desc', 'payment_terms', 'notes',
    ];
    const updates: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.validated?.[field] !== undefined) updates[field] = req.validated[field];
    }

    const [updated] = await db('invoices').where({ id }).update(updates).returning('*');
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const invoice = await db('invoices').where({ id }).first();
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    if (invoice.created_by !== req.user!.id) {
      return res.status(403).json({ error: 'Only the creator can delete this invoice' });
    }

    if (invoice.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft invoices can be deleted' });
    }

    await db('invoices').where({ id }).del();
    await logAudit(db, req.user!.id, 'invoice.deleted', 'invoice', id);
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    next(err);
  }
}

export async function convertToExpense(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const invoice = await db('invoices').where({ id }).first();
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    if (invoice.created_by !== req.user!.id) {
      return res.status(403).json({ error: 'Only the creator can convert this invoice' });
    }

    if (invoice.status !== 'draft') {
      return res.status(400).json({ error: 'Only draft invoices can be converted to expenses' });
    }

    const [expense] = await db('expenses')
      .insert({
        workspace_id: invoice.workspace_id,
        submitter_id: req.user!.id,
        amount: invoice.amount,
        currency: invoice.currency,
        merchant: invoice.client_name || invoice.client_company || 'Service Receipt',
        expense_date: new Date(),
        description: invoice.service_desc,
        notes: `Invoice #${invoice.invoice_number}: ${invoice.service_desc}`,
        invoice_id: invoice.id,
        status: 'draft',
      })
      .returning('*');

    await db('invoices').where({ id }).update({ status: 'sent' });
    await logAudit(db, req.user!.id, 'invoice.converted', 'expense', expense.id, { invoiceId: id });

    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
}

export async function downloadPdf(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const invoice = await db('invoices').where({ id }).first();
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const hasAccess = await checkWorkspaceAccess(invoice.workspace_id, req.user!.id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const pdf = await generateInvoicePdf(invoice);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${invoice.invoice_number}.pdf"`);
    res.send(pdf);
  } catch (err) {
    next(err);
  }
}
