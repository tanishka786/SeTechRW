import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth';
import { ensureUwbTopology, getUwbMapping, ingestChipRange } from '../services/uwbRanging';
import { UwbDevice } from '../models/UwbDevice';

export async function getMapping(_req: AuthedRequest, res: Response) {
  res.json(await getUwbMapping());
}

export async function listDevices(_req: AuthedRequest, res: Response) {
  await ensureUwbTopology();
  const devices = await UwbDevice.find().sort({ role: 1, name: 1 }).lean();
  res.json(devices);
}

export async function ingestRange(req: AuthedRequest, res: Response) {
  try {
    const fromId = String(req.body.fromId ?? '').trim();
    const toId = String(req.body.toId ?? '').trim();
    const distanceMm = Number(req.body.distanceMm);
    const doc = await ingestChipRange(fromId, toId, distanceMm);
    res.json(doc);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid range sample' });
  }
}
