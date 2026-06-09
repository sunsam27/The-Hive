import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as tagController from '../controllers/tag.controller.js';

const router = Router();

router.use(authenticate);

router.get('/:id/tags', tagController.listTags);
router.post('/:id/tags', tagController.addTag);
router.delete('/:id/tags/:tagName', tagController.removeTag);

export default router;
