import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { receiptUpload } from '../utils/upload.js';
import * as receiptController from '../controllers/receipt.controller.js';

const router = Router();

router.use(authenticate);

router.get('/:id/receipts', receiptController.list);
router.post('/:id/receipts', receiptUpload.single('receipt'), receiptController.upload);
router.delete('/:id/receipts/:receiptId', receiptController.remove);

export default router;
