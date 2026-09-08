import type { Response } from 'express';
import type { AuthedRequest } from '../middleware/auth';
import { ensureUwbTopology, getUwbMapping, ingestLiveRange, restartTwoBinTest, setMappingDistance, setUwbTestCase } from '../services/uwbRanging';
import { UwbDevice } from '../models/UwbDevice';

export async function getMapping(_req: AuthedRequest, res: Response) {
  res.json(await getUwbMapping());
}

export async function updateMappingDistance(req: AuthedRequest, res: Response) {
  try {
    const tagId = String(req.body.tagId ?? '').trim();
    const primaryId = String(req.body.primaryId ?? '').trim();
    const distanceM = Number(req.body.distanceM);
    res.json(await setMappingDistance(tagId, primaryId, distanceM));
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to update distance' });
  }
}

export async function listDevices(_req: AuthedRequest, res: Response) {
  await ensureUwbTopology();
  const devices = await UwbDevice.find().sort({ role: 1, name: 1 }).lean();
  res.json(devices);
}

export async function ingestRange(req: AuthedRequest, res: Response) {
  try {
    const doc = await ingestLiveRange({
      fromId: String(req.body.fromId ?? '').trim(),
      toId: String(req.body.toId ?? '').trim(),
      fromRole: String(req.body.fromRole ?? '').trim(),
      toRole: String(req.body.toRole ?? '').trim(),
      distanceM: Number(req.body.distanceM),
      distanceCm: Number(req.body.distanceCm),
      distanceMm: Number(req.body.distanceMm),
    });
    res.json(doc);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid range sample' });
  }
}

export async function updateTestCase(req: AuthedRequest, res: Response) {
  const testCase = String(req.body.testCase ?? req.body.case ?? 'C').toUpperCase();
  if (testCase !== 'A' && testCase !== 'C') {
    res.status(400).json({ error: 'testCase must be A (hop) or C (direct)' });
    return;
  }
  res.json(await setUwbTestCase(testCase));
}

export async function restartTest(_req: AuthedRequest, res: Response) {
  try {
    res.json(await restartTwoBinTest());
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to restart UWB test' });
  }
}
