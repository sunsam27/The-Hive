import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { loginLimiter, signupLimiter, forgotPasswordLimiter } from '../middleware/rateLimiter.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['freelancer', 'client']).default('freelancer'),
});

router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/signup', signupLimiter, validate(signupSchema), authController.signup);
router.get('/verify/:token', authController.verifyEmail);
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

router.get('/me', authController.getMe);
router.put('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);

export default router;
