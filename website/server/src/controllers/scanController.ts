import type { Response } from 'express';
import multer from 'multer';
import { ActivityEvent } from '../models/ActivityEvent';
import { Bin } from '../models/Bin';
import { Product } from '../models/Product';
import { ScanEvent } from '../models/ScanEvent';
import { importExcelBuffer } from '../services/excelImport';
import { lookupCode } from '../services/lookup';
import { scanStatsNow } from '../services/summary';
import type { AuthedRequest } from '../middleware/auth';
import { BIN_MAX_KG, deriveBinStatus } from '../utils/ids';

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

  const scanStats = await scanStatsNow();
  if (!result.found) {
    res.json({
      found: false,
      error: 'No matching record found for this barcode / QR code.',
      scan: { id: scan.id, createdAt: scan.createdAt },
      scanStats,
    });
    return;
  }

  res.json({ found: true, ...result, scan: { id: scan.id, createdAt: scan.createdAt }, scanStats });
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

function resolveBinId(raw: string) {
  const trimmed = String(raw ?? '').trim();
  const match = trimmed.match(/(\d+)/);
  if (match) return `BIN-${String(Number(match[1])).padStart(3, '0')}`;
  return trimmed.toUpperCase();
}

export async function placeScan(req: AuthedRequest, res: Response) {
  const scanId = String(req.body.scanId ?? '').trim();
  const productId = String(req.body.productId ?? '').trim();
  const binId = resolveBinId(String(req.body.binId ?? ''));
  const weightKg = Number(req.body.weightKg);

  if (!binId) {
    res.status(400).json({ error: 'Please select or enter a bin' });
    return;
  }
  if (!Number.isFinite(weightKg) || weightKg <= 0) {
    res.status(400).json({ error: 'Weight must be greater than 0 kg' });
    return;
  }

  const bin = await Bin.findOne({
    $or: [{ id: binId }, { name: new RegExp(`^${binId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }],
  });
  if (!bin) {
    res.status(404).json({ error: `No bin found for ${binId}. Try Bin 4 or BIN-004.` });
    return;
  }
  if (bin.status === 'Maintenance') {
    res.status(400).json({ error: `${bin.name} is under maintenance` });
    return;
  }

  const used = Math.max(0, Number(bin.capacity) || 0);
  const free = BIN_MAX_KG - used;
  if (weightKg > free) {
    res.status(400).json({ error: `${bin.name} has only ${free} kg free and cannot take ${weightKg} kg` });
    return;
  }

  bin.capacity = Math.min(BIN_MAX_KG, used + weightKg);
  bin.status = deriveBinStatus(bin.capacity, bin.status);
  bin.productCount = (bin.productCount ?? 0) + 1;
  bin.updatedBy = req.user?.id ?? null;
  await bin.save();

  if (productId) {
    const product = await Product.findOne({ id: productId });
    if (product) {
      product.binId = bin.id;
      product.lastUpdated = new Date().toISOString();
      await product.save();
    }
  }

  if (scanId) {
    const scan = await ScanEvent.findOne({ id: scanId });
    if (scan) {
      scan.binId = bin.id;
      scan.location = bin.location;
      await scan.save();
    }
  }

  await ActivityEvent.create({
    id: `evt-${Date.now()}`,
    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    timestamp: Date.now(),
    type: 'scan',
    message: `${weightKg} kg placed in ${bin.name}`,
  });

  res.json({
    bin: {
      id: bin.id,
      name: bin.name,
      location: bin.location,
      status: bin.status,
      capacity: bin.capacity,
      freeKg: BIN_MAX_KG - bin.capacity,
    },
  });
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
