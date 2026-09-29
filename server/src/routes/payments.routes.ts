import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as paymentController from '../controllers/payment.controller.js';

const router = Router();

router.post('/webhook/:provider', paymentController.handleWebhook);

router.use(authenticate);
router.post('/initiate', paymentController.initiate);
router.get('/verify/:reference', paymentController.verify);

export default router;
