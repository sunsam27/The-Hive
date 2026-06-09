import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { ocrLimiter } from '../middleware/rateLimiter.js';
import { ocrUpload } from '../utils/upload.js';
import * as ocrController from '../controllers/ocr.controller.js';

const router = Router();

router.use(authenticate);

router.post('/receipt', ocrLimiter, ocrUpload.single('receipt'), ocrController.processReceipt);

export default router;
