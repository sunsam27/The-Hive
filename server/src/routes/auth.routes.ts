import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { loginLimiter, signupLimiter, forgotPasswordLimiter } from '../middleware/rateLimiter.js';
import { avatarUpload } from '../utils/upload.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const signupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(128),
  role: z.enum(['freelancer', 'client']).default('freelancer'),
});

router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/signup', signupLimiter, validate(signupSchema), authController.signup);
router.get('/verify-email/:token', authController.verifyEmail);
const forgotPasswordSchema = z.object({
  email: z.string().email(),
});
const resetPasswordSchema = z.object({
  password: z.string().min(6).max(128),
});
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(6).max(128),
});

router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password/:token', validate(resetPasswordSchema), authController.resetPassword);
router.get('/me', authenticate, authController.getMe);
router.put('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
const profileSchema = z.object({
  name: z.string().min(1).optional(),
});
router.patch('/profile', authenticate, avatarUpload.single('avatar'), validate(profileSchema), authController.updateProfile);

export default router;
