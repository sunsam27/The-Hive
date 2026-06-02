import db from '../db/index.js';
import { checkExpenseAccess } from '../utils/accessControl.js';

export async function upload(req, res, next) {
  try {
    const expense = await checkExpenseAccess(req.params.id, req.user.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    const fileUrl = `/uploads/receipts/${req.file.filename}`;
    const ocrRawText = req.body.ocr_raw_text || '';

    const [receipt] = await db('receipts')
      .insert({ expense_id: req.params.id, file_url: fileUrl, ocr_raw_text: ocrRawText })
      .returning('*');

    res.status(201).json(receipt);
  } catch (err) {
    next(err);
  }
}

export async function list(req, res, next) {
  try {
    const expense = await checkExpenseAccess(req.params.id, req.user.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [{ count }] = await db('receipts').where({ expense_id: req.params.id }).count('* as count').first();
    const receipts = await db('receipts').where({ expense_id: req.params.id }).limit(limit).offset(offset);

    res.json({ data: receipts, total: parseInt(count), page, limit });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const receipt = await db('receipts').where({ id: req.params.receiptId }).first();
    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });

    const expense = await checkExpenseAccess(receipt.expense_id, req.user.id);
    if (!expense) return res.status(403).json({ error: 'Access denied' });

    await db('receipts').where({ id: req.params.receiptId }).del();
    res.json({ message: 'Receipt removed' });
  } catch (err) {
    next(err);
  }
}
