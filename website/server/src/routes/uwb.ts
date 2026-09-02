import { Router } from 'express';
import { getMapping, ingestRange, listDevices, updateMappingDistance, updateTestCase } from '../controllers/uwbController';

export const uwbRouter = Router();

uwbRouter.get('/uwb/mapping', getMapping);
uwbRouter.patch('/uwb/mapping', updateMappingDistance);
uwbRouter.post('/uwb/test-case', updateTestCase);
uwbRouter.get('/uwb/devices', listDevices);
uwbRouter.post('/uwb/ranges', ingestRange);
