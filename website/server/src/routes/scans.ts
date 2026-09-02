import { Router } from 'express';
import { excelUpload, importExcel, listScans, lookup, placeScan } from '../controllers/scanController';

export const scanRouter = Router();

scanRouter.get('/catalog/lookup', lookup);
scanRouter.post('/catalog/lookup', lookup);
scanRouter.get('/scans', listScans);
scanRouter.post('/scans', lookup);
scanRouter.post('/scans/place', placeScan);
scanRouter.post('/import/excel', excelUpload.single('file'), importExcel);
