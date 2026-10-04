import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as paymentController from '../controllers/payment.controller.js';
import * as paymentAccountController from '../controllers/paymentAccount.controller.js';

const router = Router();

router.post('/webhook/:provider', paymentController.handleWebhook);

router.use(authenticate);
router.get('/capabilities', paymentController.capabilities);
router.post('/initiate', paymentController.initiate);
router.get('/verify/:reference', paymentController.verify);

router.get('/accounts', paymentAccountController.getAccounts);
router.post('/accounts/stripe/onboard', paymentAccountController.startStripeOnboarding);
router.post('/accounts/stripe/sync', paymentAccountController.syncStripeAccount);
router.post('/accounts/flutterwave', paymentAccountController.addFlutterwaveSubaccount);
router.delete('/accounts/:provider', paymentAccountController.removeAccount);

export default router;
