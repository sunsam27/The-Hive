import { Request, Response, NextFunction } from 'express';
import { appendFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.resolve(__dirname, '../../error.log');

interface ZodLikeError extends Error {
  errors: Array<{ path: (string | number)[]; message: string }>;
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  const log = `[${new Date().toISOString()}] ${err.stack || err.message || err}\n`;
  console.error(log);
  try { appendFileSync(LOG_FILE, log); } catch { /* ignore */ }

  if (err.name === 'ZodError') {
    const zodErr = err as ZodLikeError;
    res.status(400).json({
      error: 'Validation failed',
      details: zodErr.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  const statusErr = err as Error & { status?: number };
  if (statusErr.status) {
    res.status(statusErr.status).json({ error: err.message });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}
