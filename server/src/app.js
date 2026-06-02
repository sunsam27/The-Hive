import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import uploadRoutes from './routes/uploads.routes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

app.use('/uploads', uploadRoutes);

app.use('/api', routes);

app.use(errorHandler);

export default app;
