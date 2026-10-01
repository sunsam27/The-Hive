import { Request, Response, NextFunction } from 'express';
import { checkWorkspaceAccess } from '../utils/accessControl.js';
import { billingStatus, listPublicPlans } from '../services/billing.js';

export async function plans(_req: Request, res: Response, next: NextFunction) {
  try {
    res.json({ plans: listPublicPlans() });
  } catch (err) {
    next(err);
  }
}

export async function status(req: Request, res: Response, next: NextFunction) {
  try {
    const workspaceId = (req.query.workspaceId || req.body?.workspaceId) as string | undefined;
    if (!workspaceId) return res.status(400).json({ error: 'workspaceId is required' });

    const hasAccess = await checkWorkspaceAccess(workspaceId, req.user!.id);
    if (!hasAccess) return res.status(403).json({ error: 'Access denied' });

    res.json(await billingStatus(workspaceId));
  } catch (err) {
    next(err);
  }
}
