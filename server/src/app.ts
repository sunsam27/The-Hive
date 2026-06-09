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
const allowedOrigins = [clientUrl];
if (process.env.VERCEL_URL) allowedOrigins.push(`https://${process.env.VERCEL_URL}`);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    if (origin && (origin.startsWith('https://the-hive-') && origin.endsWith('.vercel.app'))) return cb(null, true);
    cb(new Error(`CORS: origin '${origin}' not allowed`));
  },
}));
app.use(express.json({ limit: '5mb' }));

app.use('/api', routes);

app.use(errorHandler);

export default app;
