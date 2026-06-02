import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { ocrLimiter } from '../middleware/rateLimiter.js';
import * as ocrController from '../controllers/ocr.controller.js';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP, and PDF files are allowed'));
  },
});

router.use(authenticate);

router.post('/receipt', ocrLimiter, upload.single('receipt'), ocrController.processReceipt);

export default router;
