import { Router } from 'express';
import { getMapping, ingestRange, listDevices, restartTest, updateMappingDistance, updateTestCase } from '../controllers/uwbController';

export const uwbRouter = Router();

uwbRouter.get('/uwb/mapping', getMapping);
uwbRouter.patch('/uwb/mapping', updateMappingDistance);
uwbRouter.post('/uwb/test-case', updateTestCase);
uwbRouter.post('/uwb/restart', restartTest);
uwbRouter.get('/uwb/devices', listDevices);
uwbRouter.post('/uwb/ranges', ingestRange);
