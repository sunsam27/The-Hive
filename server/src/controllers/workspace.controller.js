import db from '../db/index.js';
import { checkWorkspaceAccess } from '../utils/accessControl.js';

export async function list(req, res, next) {
  try {
    const workspaces = await db('workspaces')
      .join('workspace_members', 'workspaces.id', 'workspace_members.workspace_id')
      .where('workspace_members.user_id', req.user.id)
      .select('workspaces.*');
    res.json(workspaces);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, description } = req.validated;
    const [workspace] = await db('workspaces')
      .insert({ name, description, owner_id: req.user.id })
      .returning('*');

    await db('workspace_members').insert({
      workspace_id: workspace.id,
      user_id: req.user.id,
      role: 'admin',
    });

    res.status(201).json(workspace);
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const workspace = await db('workspaces').where({ id: req.params.id }).first();
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

    const hasAccess = await checkWorkspaceAccess(req.params.id, req.user.id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    const members = await db('workspace_members')
      .join('users', 'workspace_members.user_id', 'users.id')
      .where('workspace_members.workspace_id', req.params.id)
      .select('users.id', 'users.name', 'users.email', 'workspace_members.role');

    res.json({ ...workspace, members });
  } catch (err) {
    next(err);
  }
}

export async function updateWorkspace(req, res, next) {
  try {
    const workspace = await db('workspaces').where({ id: req.params.id }).first();
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

    if (workspace.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the owner can edit workspace settings' });
    }

    const { name, description } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;

    const [updated] = await db('workspaces').where({ id: req.params.id }).update(updates).returning('*');
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function removeMember(req, res, next) {
  try {
    const workspace = await db('workspaces').where({ id: req.params.id }).first();
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

    const isOwner = workspace.owner_id === req.user.id;
    const requesterMember = await db('workspace_members')
      .where({ workspace_id: req.params.id, user_id: req.user.id })
      .first();

    if (!isOwner && requesterMember?.role !== 'admin') {
      return res.status(403).json({ error: 'Only owners and admins can remove members' });
    }

    const targetMember = await db('workspace_members')
      .where({ workspace_id: req.params.id, user_id: req.params.userId })
      .first();

    if (!targetMember) return res.status(404).json({ error: 'Member not found' });
    if (targetMember.user_id === workspace.owner_id) {
      return res.status(400).json({ error: 'Cannot remove the workspace owner' });
    }

    await db('workspace_members').where({ workspace_id: req.params.id, user_id: req.params.userId }).del();
    res.json({ message: 'Member removed' });
  } catch (err) {
    next(err);
  }
}

export async function updateMemberRole(req, res, next) {
  try {
    const workspace = await db('workspaces').where({ id: req.params.id }).first();
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

    const isOwner = workspace.owner_id === req.user.id;
    const requesterMember = await db('workspace_members')
      .where({ workspace_id: req.params.id, user_id: req.user.id })
      .first();

    if (!isOwner && requesterMember?.role !== 'admin') {
      return res.status(403).json({ error: 'Only owners and admins can change roles' });
    }

    const targetMember = await db('workspace_members')
      .where({ workspace_id: req.params.id, user_id: req.params.userId })
      .first();

    if (!targetMember) return res.status(404).json({ error: 'Member not found' });
    if (targetMember.user_id === workspace.owner_id) {
      return res.status(400).json({ error: 'Cannot change the workspace owner role' });
    }

    const { role } = req.body;
    if (!role || !['admin', 'member', 'client'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, member, or client' });
    }

    await db('workspace_members')
      .where({ workspace_id: req.params.id, user_id: req.params.userId })
      .update({ role });

    res.json({ message: 'Role updated' });
  } catch (err) {
    next(err);
  }
}

export async function addMember(req, res, next) {
  try {
    const workspace = await db('workspaces').where({ id: req.params.id }).first();
    if (!workspace) return res.status(404).json({ error: 'Workspace not found' });

    const requesterMember = await db('workspace_members')
      .where({ workspace_id: req.params.id, user_id: req.user.id })
      .first();

    const isOwner = workspace.owner_id === req.user.id;
    const isAdmin = requesterMember?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Only workspace owners and admins can add members' });
    }

    const { email, role } = req.body;
    const user = await db('users').where({ email }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const existing = await db('workspace_members')
      .where({ workspace_id: req.params.id, user_id: user.id })
      .first();
    if (existing) return res.status(409).json({ error: 'Already a member' });

    const [member] = await db('workspace_members')
      .insert({ workspace_id: req.params.id, user_id: user.id, role: role || 'member' })
      .returning('*');

    res.status(201).json(member);
  } catch (err) {
    next(err);
  }
}
