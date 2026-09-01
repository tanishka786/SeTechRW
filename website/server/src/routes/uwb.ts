import { Router } from 'express';
import { getMapping, ingestRange, listDevices } from '../controllers/uwbController';

export const uwbRouter = Router();

uwbRouter.get('/uwb/mapping', getMapping);
uwbRouter.get('/uwb/devices', listDevices);
uwbRouter.post('/uwb/ranges', ingestRange);
