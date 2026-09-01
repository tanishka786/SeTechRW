import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { connectDb } from './config/db';
import { apiRouter } from './routes/index';
import { startLiveSimulation } from './services/liveSim';
import { startDummyUwb } from './services/uwbRanging';

const app = express();
app.use(cors({ origin: env.clientOrigin, credentials: true, allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '2mb' }));
app.use('/api', apiRouter);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(500).json({ error: 'Unable to reach the warehouse database. Please try again.' });
});

async function start() {
  try {
    await connectDb();
    startLiveSimulation();
    startDummyUwb();
    app.listen(env.port, () => {
      console.log(`Birla Carbon API listening on http://localhost:${env.port}`);
    });
  } catch (error) {
    console.error('Failed to start API. Is MongoDB running?', error);
    process.exit(1);
  }
}

start();
