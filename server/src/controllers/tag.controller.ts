import { Request, Response, NextFunction } from 'express';
import db from '../db/index.js';
import { checkExpenseAccess } from '../utils/accessControl.js';

export async function addTag(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const expense = await checkExpenseAccess(id, req.user!.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    const { name } = req.body as { name: string };
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const trimmed = name.trim().slice(0, 50);
    const existing = await db('expense_tags')
      .where({ expense_id: id, name: trimmed })
      .first();
    if (existing) return res.status(409).json({ error: 'Tag already exists' });

    const [tag] = await db('expense_tags')
      .insert({ expense_id: id, name: trimmed })
      .returning('*');

    res.status(201).json(tag);
  } catch (err) {
    next(err);
  }
}

export async function listTags(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const expense = await checkExpenseAccess(id, req.user!.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const result = await db('expense_tags').where({ expense_id: id }).count('* as count').first();
    const count = result?.count ?? 0;
    const tags = await db('expense_tags')
      .where({ expense_id: id })
      .select('name')
      .limit(limit)
      .offset(offset);

    res.json({ data: tags.map((t: any) => t.name), total: Number(count), page, limit });
  } catch (err) {
    next(err);
  }
}

export async function removeTag(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const expense = await checkExpenseAccess(id, req.user!.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    const deleted = await db('expense_tags')
      .where({ expense_id: id, name: req.params.tagName as string })
      .del();
    if (!deleted) return res.status(404).json({ error: 'Tag not found' });
    res.json({ message: 'Tag removed' });
  } catch (err) {
    next(err);
  }
}
