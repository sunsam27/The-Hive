import { Router } from 'express';
import express from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'hive-dev-secret-change-in-production';

router.use((req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
});

router.use(express.static(path.resolve('uploads')));

export default router;
