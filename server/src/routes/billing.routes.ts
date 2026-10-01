import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as billingController from '../controllers/billing.controller.js';
import * as checkoutController from '../controllers/billingCheckout.controller.js';

const router = Router();

router.get('/plans', billingController.plans);
router.get('/status', authenticate, billingController.status);
router.post('/checkout', authenticate, checkoutController.initiateProPurchase);
router.get('/checkout/:reference', authenticate, checkoutController.completeProPurchase);

export default router;
