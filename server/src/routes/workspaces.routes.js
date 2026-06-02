import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as workspaceController from '../controllers/workspace.controller.js';

const router = Router();

router.use(authenticate);

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

router.get('/', workspaceController.list);
router.post('/', validate(createSchema), workspaceController.create);
router.get('/:id', workspaceController.getById);
router.patch('/:id', workspaceController.updateWorkspace);
router.post('/:id/members', workspaceController.addMember);
router.delete('/:id/members/:userId', workspaceController.removeMember);
router.patch('/:id/members/:userId', workspaceController.updateMemberRole);

export default router;
