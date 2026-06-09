import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as workspaceController from '../controllers/workspace.controller.js';

const router = Router();

router.use(authenticate);

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

router.get('/', workspaceController.list);
router.post('/', validate(createSchema), workspaceController.create);
router.get('/:id', workspaceController.getById);
const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
});
const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'client']).optional(),
});
const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member', 'client']),
});

router.delete('/:id', workspaceController.deleteWorkspace);
router.patch('/:id', validate(updateWorkspaceSchema), workspaceController.updateWorkspace);
router.post('/:id/members', validate(addMemberSchema), workspaceController.addMember);
router.delete('/:id/members/:userId', workspaceController.removeMember);
router.patch('/:id/members/:userId', validate(updateMemberRoleSchema), workspaceController.updateMemberRole);

export default router;
