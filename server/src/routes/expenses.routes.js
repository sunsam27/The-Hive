import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as expenseController from '../controllers/expense.controller.js';

const router = Router();

router.use(authenticate);

const uploadDir = path.resolve('uploads/proofs');
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

const createSchema = z.object({
  workspaceId: z.string().uuid(),
  amount: z.number().positive(),
  merchant: z.string().optional(),
  expenseDate: z.string().optional(),
  currency: z.string().length(3).optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = z.object({
  amount: z.number().positive().optional(),
  merchant: z.string().optional(),
  expenseDate: z.string().optional(),
  currency: z.string().length(3).optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

const reviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes: z.string().optional(),
});

router.get('/', expenseController.list);
router.get('/export/csv', expenseController.exportCsv);
router.post('/', validate(createSchema), expenseController.create);
router.post('/submit-all-drafts', expenseController.submitAllDrafts);
router.get('/:id', expenseController.getById);
router.patch('/:id', validate(updateSchema), expenseController.update);
router.delete('/:id', expenseController.remove);
router.post('/:id/submit', expenseController.submit);
router.post('/:id/pay', upload.single('proof'), expenseController.pay);
router.patch('/:id/review', validate(reviewSchema), expenseController.review);

export default router;
