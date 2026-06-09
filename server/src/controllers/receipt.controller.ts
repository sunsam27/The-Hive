import { Request, Response, NextFunction } from 'express';
import db from '../db/index.js';
import { checkExpenseAccess } from '../utils/accessControl.js';
import { uploadFile, deleteFile } from '../utils/cloudinary.js';

export async function upload(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const expense = await checkExpenseAccess(id, req.user!.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const fileUrl = await uploadFile(req.file.buffer, 'receipts');
    const ocrRawText = req.body.ocr_raw_text || '';

    const [receipt] = await db('receipts')
      .insert({ expense_id: id, file_url: fileUrl, ocr_raw_text: ocrRawText })
      .returning('*');

    res.status(201).json(receipt);
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const expense = await checkExpenseAccess(id, req.user!.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const result = await db('receipts').where({ expense_id: id }).count('* as count').first();
    const count = result?.count ?? 0;
    const receipts = await db('receipts').where({ expense_id: id }).limit(limit).offset(offset);

    res.json({ data: receipts, total: Number(count), page, limit });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const receiptId = req.params.receiptId as string;
    const receipt = await db('receipts').where({ id: receiptId }).first();
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });

    const expense = await checkExpenseAccess(receipt.expense_id, req.user!.id);
    if (!expense) return res.status(403).json({ error: 'Access denied' });

    if (expense.status !== 'draft') {
      return res.status(400).json({ error: 'Receipts can only be removed from draft expenses' });
    }

    await db('receipts').where({ id: receiptId }).del();
    await deleteFile(receipt.file_url);

    res.json({ message: 'Receipt removed' });
  } catch (err) {
    next(err);
  }
}
