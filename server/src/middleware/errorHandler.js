import { writeFileSync, appendFileSync } from 'fs';

export function errorHandler(err, req, res, _next) {
  const log = `[${new Date().toISOString()}] ${err.stack || err.message || err}\n`;
  console.error(log);
  try { appendFileSync('error.log', log); } catch {}


  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Validation failed', details: err.errors });
  }

  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  res.status(500).json({ error: 'Internal server error' });
}
