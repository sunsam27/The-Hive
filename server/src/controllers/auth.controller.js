import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from '../db/index.js';
import { sendVerificationEmail, sendResetEmail } from '../services/email.js';

export async function signup(req, res, next) {
  try {
    const { name, email, password, role } = req.validated;

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

export async function verifyEmail(req, res, next) {
  try {
    const { token } = req.params;

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

export async function login(req, res, next) {
  try {
    const { email, password } = req.validated;

    const user = await db('users').where({ email }).first();
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.verified) {
      return res.status(403).json({ error: 'Please verify your email before signing in.' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    const { password_hash, verification_token, reset_token, reset_token_expires, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await db('users').where({ id: req.user.id }).first();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { password_hash, verification_token, reset_token, reset_token_expires, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.validated;

    const user = await db('users').where({ email }).first();
    if (!user) return res.json({ message: 'If the email exists, a reset link has been sent.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db('users')
      .where({ id: user.id })
      .update({ reset_token: resetToken, reset_token_expires: expires });

    await sendResetEmail(email, user.name, resetToken);

    res.json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.validated;
    const user = await db('users').where({ id: req.user.id }).first();

    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) return res.status(400).json({ error: 'Current password is incorrect' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db('users').where({ id: user.id }).update({ password_hash: passwordHash });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { token } = req.params;
    const { password } = req.validated;

    const user = await db('users')
      .where({ reset_token: token })
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

export async function updateProfile(req, res, next) {
  try {
    const updates = {};
    if (req.validated?.name) updates.name = req.validated.name;
    if (req.file) updates.avatar_url = `/uploads/avatars/${req.file.filename}`;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const [user] = await db('users').where({ id: req.user.id }).update(updates).returning('*');
    const { password_hash, verification_token, reset_token, reset_token_expires, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    next(err);
  }
}
