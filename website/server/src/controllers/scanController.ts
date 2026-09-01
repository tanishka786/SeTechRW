import type { Response } from 'express';
import multer from 'multer';
import { ScanEvent } from '../models/ScanEvent';
import { importExcelBuffer } from '../services/excelImport';
import { lookupCode } from '../services/lookup';
import type { AuthedRequest } from '../middleware/auth';

export const excelUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

export async function lookup(req: AuthedRequest, res: Response) {
  const code = String(req.query.code ?? req.body.code ?? '');
  const codeType = String(req.body.codeType ?? req.query.type ?? 'Manual');
  if (!code.trim()) {
    res.status(400).json({ error: 'Please enter or scan a valid code' });
    return;
  }

  const result = await lookupCode(code);
  const scan = await ScanEvent.create({
    id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    code: code.trim(),
    codeType: ['QR', 'Barcode', 'Manual', 'Image'].includes(codeType) ? codeType : 'Manual',
    status: result.found ? 'Found' : 'Not Found',
    matchedItem: result.found ? result.matchedItem : '',
    location: result.found ? result.location : '',
    catalogId: result.catalog?.productRef ?? null,
    productId: result.product?.id ?? null,
    binId: result.bin?.id ?? null,
    forkliftId: result.forklift?.id ?? null,
    result,
    createdBy: req.user?.id ?? null,
  });

  if (!result.found) {
    res.json({
      found: false,
      error: 'No matching record found for this barcode / QR code.',
      scan: { id: scan.id, createdAt: scan.createdAt },
    });
    return;
  }

  res.json({ found: true, ...result, scan: { id: scan.id, createdAt: scan.createdAt } });
}

export async function listScans(req: AuthedRequest, res: Response) {
  const q = String(req.query.q ?? '').trim();
  const status = String(req.query.status ?? 'all');
  const filter: Record<string, unknown> = {};
  if (status === 'Found' || status === 'Not Found') filter.status = status;
  if (q) {
    filter.$or = [
      { code: new RegExp(q, 'i') },
      { matchedItem: new RegExp(q, 'i') },
      { location: new RegExp(q, 'i') },
    ];
  }
  const scans = await ScanEvent.find(filter).sort({ createdAt: -1 }).limit(100).lean();
  res.json(scans);
}

export async function importExcel(req: AuthedRequest, res: Response) {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'Please upload an Excel file' });
    return;
  }
  try {
    const result = await importExcelBuffer(file.buffer, file.originalname, req.user?.id);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to import Excel file' });
  }
}
