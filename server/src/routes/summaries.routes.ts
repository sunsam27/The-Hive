import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as summaryController from '../controllers/summary.controller.js';

const router = Router();

router.use(authenticate);

router.get('/:workspaceId', summaryController.getByWorkspace);

export default router;
