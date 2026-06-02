import db from '../db/index.js';
import { checkExpenseAccess } from '../utils/accessControl.js';

export async function addTag(req, res, next) {
  try {
    const expense = await checkExpenseAccess(req.params.id, req.user.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Tag name is required' });
    }

    const trimmed = name.trim().slice(0, 50);
    const existing = await db('expense_tags')
      .where({ expense_id: req.params.id, name: trimmed })
      .first();
    if (existing) return res.status(409).json({ error: 'Tag already exists' });

    const [tag] = await db('expense_tags')
      .insert({ expense_id: req.params.id, name: trimmed })
      .returning('*');

    res.status(201).json(tag);
  } catch (err) {
    next(err);
  }
}

export async function listTags(req, res, next) {
  try {
    const expense = await checkExpenseAccess(req.params.id, req.user.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [{ count }] = await db('expense_tags').where({ expense_id: req.params.id }).count('* as count').first();
    const tags = await db('expense_tags')
      .where({ expense_id: req.params.id })
      .select('name')
      .limit(limit)
      .offset(offset);

    res.json({ data: tags.map((t) => t.name), total: parseInt(count), page, limit });
  } catch (err) {
    next(err);
  }
}

export async function removeTag(req, res, next) {
  try {
    const expense = await checkExpenseAccess(req.params.id, req.user.id);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    const deleted = await db('expense_tags')
      .where({ expense_id: req.params.id, name: req.params.tagName })
      .del();
    if (!deleted) return res.status(404).json({ error: 'Tag not found' });
    res.json({ message: 'Tag removed' });
  } catch (err) {
    next(err);
  }
}
