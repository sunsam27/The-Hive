import { Router } from 'express';
import authRoutes from './auth.routes.js';
import workspaceRoutes from './workspaces.routes.js';
import expenseRoutes from './expenses.routes.js';
import summaryRoutes from './summaries.routes.js';
import ocrRoutes from './ocr.routes.js';
import receiptRoutes from './receipt.routes.js';
import tagRoutes from './tag.routes.js';
import invoiceRoutes from './invoices.routes.js';
import paymentRoutes from './payments.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/expenses', expenseRoutes);
router.use('/expenses', receiptRoutes);
router.use('/expenses', tagRoutes);
router.use('/summaries', summaryRoutes);
router.use('/ocr', ocrRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/payments', paymentRoutes);

export default router;
