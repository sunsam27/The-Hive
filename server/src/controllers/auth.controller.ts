import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createHash } from 'crypto';
import db from '../db/index.js';
import { sendVerificationEmail, sendResetEmail } from '../services/email.js';
import { uploadFile } from '../utils/cloudinary.js';

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password, role } = req.validated as { name: string; email: string; password: string; role?: string };

    const existing = await db('users').where({ email }).first();
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    await db('users').insert({
      name,
      email,
      password_hash: passwordHash,
      role,
      verification_token: verificationToken,
      verified: false,
    });

    await sendVerificationEmail(email, name, verificationToken);

    res.status(201).json({
      message: 'Account created. Check your email to verify your account.',
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.params as { token: string };

    const [user] = await db('users')
      .where({ verification_token: token })
      .update({ verified: true, verification_token: null })
      .returning(['id', 'name', 'email']);

    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

    res.json({ message: 'Email verified. You can now sign in.' });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.validated as { email: string; password: string };

    const user = await db('users').where({ email }).first();
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.verified) {
      return res.status(403).json({ error: 'Please verify your email before signing in.' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    } as jwt.SignOptions);

    const { password_hash, verification_token, reset_token, reset_token_expires, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await db('users').where({ id: req.user!.id }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { password_hash, verification_token, reset_token, reset_token_expires, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { email } = req.validated as { email: string };

    const user = await db('users').where({ email }).first();
    if (!user) return res.json({ message: 'If the email exists, a reset link has been sent.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = hashToken(resetToken);
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await db('users')
      .where({ id: user.id })
      .update({ reset_token: hashedToken, reset_token_expires: expires });

    await sendResetEmail(email, user.name, resetToken);

    res.json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { currentPassword, newPassword } = req.validated as { currentPassword: string; newPassword: string };
    const user = await db('users').where({ id: req.user!.id }).first();

    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) return res.status(400).json({ error: 'Current password is incorrect' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db('users').where({ id: user.id }).update({ password_hash: passwordHash });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token } = req.params as { token: string };
    const { password } = req.validated as { password: string };

    const hashedToken = hashToken(token);
    const user = await db('users')
      .where({ reset_token: hashedToken })
      .where('reset_token_expires', '>', new Date())
      .first();

    if (!user) return res.status(400).json({ error: 'Invalid or expired reset token' });

    const passwordHash = await bcrypt.hash(password, 10);

    await db('users')
      .where({ id: user.id })
      .update({ password_hash: passwordHash, reset_token: null, reset_token_expires: null });

    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const updates: Record<string, string> = {};
    if (req.validated?.name) updates.name = req.validated.name as string;
    if (req.file) updates.avatar_url = await uploadFile(req.file.buffer, 'avatars');

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const [user] = await db('users').where({ id: req.user!.id }).update(updates).returning('*');
    const { password_hash, verification_token, reset_token, reset_token_expires, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    next(err);
  }
}
