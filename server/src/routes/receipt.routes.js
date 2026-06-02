import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { authenticate } from '../middleware/auth.js';
import * as receiptController from '../controllers/receipt.controller.js';

const router = Router();

const uploadDir = path.resolve('uploads/receipts');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP, and PDF files are allowed'));
  },
});

router.use(authenticate);

router.get('/:id/receipts', receiptController.list);
router.post('/:id/receipts', upload.single('receipt'), receiptController.upload);
router.delete('/:id/receipts/:receiptId', receiptController.remove);

export default router;
