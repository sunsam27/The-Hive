import { Router } from 'express';
import express from 'express';
import path from 'path';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.use(authenticate);
router.use(express.static(path.resolve('uploads')));

export default router;
