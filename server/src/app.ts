import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.set('trust proxy', 1);

const clientUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", "https:", "data:"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      imgSrc: ["'self'", "data:", clientUrl],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", "https:", "'unsafe-inline'"],
      upgradeInsecureRequests: [],
    },
  },
}));
const extraOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = [clientUrl, ...extraOrigins];
if (process.env.VERCEL_URL) allowedOrigins.push(`https://${process.env.VERCEL_URL}`);

// Preview deployments get a random subdomain per branch, so they cannot be
// listed one by one. Only exact project-name prefixes on vercel.app are
// accepted, and the list is configurable so renaming the Vercel project does
// not silently lock out your own preview deployments.
const vercelProjectPrefixes = (process.env.VERCEL_PROJECT_PREFIXES || 'the-hive,finsyte')
  .split(',')
  .map((prefix) => prefix.trim().toLowerCase())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    if (origin.startsWith('https://') && origin.endsWith('.vercel.app')) {
      const project = origin.slice('https://'.length, -'.vercel.app'.length).toLowerCase();
      if (vercelProjectPrefixes.some((prefix) => project === prefix || project.startsWith(`${prefix}-`))) {
        return cb(null, true);
      }
    }
    cb(new Error(`CORS: origin '${origin}' not allowed`));
  },
}));
app.use(express.json({
  limit: '5mb',
  verify: (req, _res, buf) => {
    if ((req as any).originalUrl?.includes('/webhook/')) {
      (req as any).rawBody = buf.toString('utf8');
    }
  },
}));

app.use('/api', routes);

app.use(errorHandler);

export default app;
