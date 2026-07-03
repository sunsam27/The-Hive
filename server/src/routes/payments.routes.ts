import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as paymentController from '../controllers/payment.controller.js';

const router = Router();

router.post('/webhook/flutterwave', paymentController.handleWebhook);

router.use(authenticate);
router.post('/initiate', paymentController.initiate);
router.get('/verify/:txRef', paymentController.verify);

export default router;
