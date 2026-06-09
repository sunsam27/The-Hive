import { Request, Response, NextFunction } from 'express';
import db from '../db/index.js';
import { checkWorkspaceAccess } from '../utils/accessControl.js';
import { logAudit } from '../utils/auditLog.js';
import { deleteFile } from '../utils/cloudinary.js';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    let baseQuery = db('workspaces')
      .join('workspace_members', 'workspaces.id', 'workspace_members.workspace_id')
      .where('workspace_members.user_id', req.user!.id);

    const { count } = (await baseQuery.clone().countDistinct('workspaces.id as count').first()) || { count: 0 };

    const workspaces = await baseQuery
      .clone()
      .select('workspaces.*')
      .orderBy('workspaces.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    res.json({ data: workspaces, total: Number(count), page, limit });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, description } = req.validated as { name: string; description?: string };

    let workspace: any;
    await db.transaction(async (trx: any) => {
      [workspace] = await trx('workspaces')
        .insert({ name, description, owner_id: req.user!.id })
        .returning('*');

      await trx('workspace_members').insert({
        workspace_id: workspace.id,
        user_id: req.user!.id,
        role: 'admin',
      });

      await logAudit(trx, req.user!.id, 'workspace.created', 'workspace', workspace.id, { name });
    });

    res.status(201).json(workspace);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const workspace = await db('workspaces').where({ id }).first();
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

    const hasAccess = await checkWorkspaceAccess(id, req.user!.id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const members = await db('workspace_members')
      .join('users', 'workspace_members.user_id', 'users.id')
      .where('workspace_members.workspace_id', id)
      .select('users.id', 'users.name', 'users.email', 'workspace_members.role');

    res.json({ ...workspace, members });
  } catch (err) {
    next(err);
  }
}

export async function updateWorkspace(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const workspace = await db('workspaces').where({ id }).first();
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

    if (workspace.owner_id !== req.user!.id) {
      return res.status(403).json({ error: 'Only the owner can edit workspace settings' });
    }

    const { name, description } = req.validated as { name?: string; description?: string };
    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    const [updated] = await db('workspaces').where({ id }).update(updates).returning('*');

    await logAudit(db, req.user!.id, 'workspace.updated', 'workspace', id, { changes: Object.keys(updates) });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const userId = req.params.userId as string;
    const workspace = await db('workspaces').where({ id }).first();
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

    const isOwner = workspace.owner_id === req.user!.id;
    const requesterMember = await db('workspace_members')
      .where({ workspace_id: id, user_id: req.user!.id })
      .first();

    if (!isOwner && requesterMember?.role !== 'admin') {
      return res.status(403).json({ error: 'Only owners and admins can remove members' });
    }

    const targetMember = await db('workspace_members')
      .where({ workspace_id: id, user_id: userId })
      .first();

    if (!targetMember) return res.status(404).json({ error: 'Member not found' });
    if (targetMember.user_id === workspace.owner_id) {
      return res.status(400).json({ error: 'Cannot remove the workspace owner' });
    }

    await db('workspace_members').where({ workspace_id: id, user_id: userId }).del();

    await logAudit(db, req.user!.id, 'member.removed', 'workspace', id, { removedUserId: userId });

    res.json({ message: 'Member removed' });
  } catch (err) {
    next(err);
  }
}

export async function updateMemberRole(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const userId = req.params.userId as string;
    const workspace = await db('workspaces').where({ id }).first();
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

    const isOwner = workspace.owner_id === req.user!.id;
    const requesterMember = await db('workspace_members')
      .where({ workspace_id: id, user_id: req.user!.id })
      .first();

    if (!isOwner && requesterMember?.role !== 'admin') {
      return res.status(403).json({ error: 'Only owners and admins can change roles' });
    }

    const targetMember = await db('workspace_members')
      .where({ workspace_id: id, user_id: userId })
      .first();

    if (!targetMember) return res.status(404).json({ error: 'Member not found' });
    if (targetMember.user_id === workspace.owner_id) {
      return res.status(400).json({ error: 'Cannot change the workspace owner role' });
    }

    const { role } = req.validated as { role: string };

    await db('workspace_members')
      .where({ workspace_id: id, user_id: userId })
      .update({ role });

    await logAudit(db, req.user!.id, 'member.role_updated', 'workspace', id, { targetUserId: userId, newRole: role });

    res.json({ message: 'Role updated' });
  } catch (err) {
    next(err);
  }
}

export async function deleteWorkspace(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const workspace = await db('workspaces').where({ id }).first();
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

    if (workspace.owner_id !== req.user!.id) {
      return res.status(403).json({ error: 'Only the owner can delete the workspace' });
    }

    await db.transaction(async (trx: any) => {
      const expenses = await trx('expenses').where({ workspace_id: id });
      const expenseIds = expenses.map((e: any) => e.id);

      if (expenseIds.length > 0) {
        const receipts = await trx('receipts').whereIn('expense_id', expenseIds);
        await trx('expense_tags').whereIn('expense_id', expenseIds).del();
        await trx('receipts').whereIn('expense_id', expenseIds).del();
        await trx('expenses').whereIn('id', expenseIds).del();

        for (const r of receipts) {
          await deleteFile(r.file_url);
        }
      }

      await trx('workspace_members').where({ workspace_id: id }).del();
      await trx('audit_log').where({ resource_id: id, resource_type: 'workspace' }).del();
      await trx('workspaces').where({ id }).del();

      await logAudit(trx, req.user!.id, 'workspace.deleted', 'workspace', id, { name: workspace.name });
    });

    res.json({ message: 'Workspace deleted' });
  } catch (err) {
    next(err);
  }
}

export async function addMember(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    const workspace = await db('workspaces').where({ id }).first();
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

    const requesterMember = await db('workspace_members')
      .where({ workspace_id: id, user_id: req.user!.id })
      .first();

    const isOwner = workspace.owner_id === req.user!.id;
    const isAdmin = requesterMember?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Only workspace owners and admins can add members' });
    }

    const { email, role } = req.validated as { email: string; role?: string };
    const user = await db('users').where({ email }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const existing = await db('workspace_members')
      .where({ workspace_id: id, user_id: user.id })
      .first();
    if (existing) return res.status(409).json({ error: 'Already a member' });

    const [member] = await db('workspace_members')
      .insert({ workspace_id: id, user_id: user.id, role: role || 'member' })
      .returning('*');

    await logAudit(db, req.user!.id, 'member.added', 'workspace', id, { addedUserId: user.id, role: role || 'member' });

    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
}
