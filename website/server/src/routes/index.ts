import { Router } from 'express';
import mongoose from 'mongoose';
import { authRouter } from './auth';
import { warehouseRouter } from './warehouse';
import { scanRouter } from './scans';
import { uwbRouter } from './uwb';
import { requireAuth } from '../middleware/auth';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({
    ok: mongoose.connection.readyState === 1,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

apiRouter.use('/auth', authRouter);
apiRouter.use(requireAuth, warehouseRouter);
apiRouter.use(requireAuth, scanRouter);
apiRouter.use(requireAuth, uwbRouter);
