import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as invoiceController from '../controllers/invoice.controller.js';

const router = Router();
router.use(authenticate);

const createSchema = z.object({
  workspaceId: z.string().uuid(),
  serviceDesc: z.string().min(1).max(2000),
  amount: z.number().positive(),
  currency: z.string().length(3).optional(),
  clientName: z.string().max(255).optional(),
  clientCompany: z.string().max(255).optional(),
  clientEmail: z.string().email().optional().or(z.literal('')),
  freelancerName: z.string().min(1).max(255),
  freelancerBusiness: z.string().max(255).optional(),
  freelancerContact: z.string().max(255).optional(),
  taxAmount: z.number().min(0).optional(),
  taxDesc: z.string().max(255).optional(),
  paymentTerms: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
});

const updateSchema = z.object({
  serviceDesc: z.string().min(1).max(2000).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  clientName: z.string().max(255).optional(),
  clientCompany: z.string().max(255).optional(),
  clientEmail: z.string().email().optional().or(z.literal('')),
  freelancerName: z.string().min(1).max(255).optional(),
  freelancerBusiness: z.string().max(255).optional(),
  freelancerContact: z.string().max(255).optional(),
  taxAmount: z.number().min(0).optional(),
  taxDesc: z.string().max(255).optional(),
  paymentTerms: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
});

router.get('/', invoiceController.list);
router.post('/', validate(createSchema), invoiceController.create);
router.get('/:id', invoiceController.getById);
router.patch('/:id', validate(updateSchema), invoiceController.update);
router.delete('/:id', invoiceController.remove);
router.post('/:id/convert', invoiceController.convertToExpense);
router.get('/:id/download', invoiceController.downloadPdf);

export default router;
