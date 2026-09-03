import { Bin } from '../models/Bin';
import { Forklift } from '../models/Forklift';
import { Settings } from '../models/Settings';
import { UwbDevice } from '../models/UwbDevice';
import { UwbDistance } from '../models/UwbDistance';
import { UwbRange } from '../models/UwbRange';

const CHIP = 'Qorvo DWM3001C';
const CHIP_STALE_MS = 20_000;
const FLOOR = { minX: 1, maxX: 31, minY: 1, maxY: 27 };

export const TEST_FORKLIFT_ID = 'FLT-001';
export const TEST_BIN_ID = 'BIN-001';
export const TEST_BIN_2_ID = 'BIN-002';
export const TEST_SECONDARY_ID = 'ANC-S-A';

const TEST_MAC = {
  tag: '00:00',
  primary: '00:01',
  secondary: '00:02',
  bin2: '00:02',
} as const;

export function pairKey(a: string, b: string) {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

export function mappingKey(tagId: string, primaryId: string) {
  return `${tagId}::${primaryId}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

async function applyTestChipMacs() {
  await Promise.all([
    UwbDevice.updateOne({ role: 'tag', forkliftId: TEST_FORKLIFT_ID }, { $set: { macAddress: TEST_MAC.tag } }),
    UwbDevice.updateOne({ role: 'primary', binId: TEST_BIN_ID }, { $set: { macAddress: TEST_MAC.primary } }),
    UwbDevice.updateOne({ role: 'primary', binId: TEST_BIN_2_ID }, { $set: { macAddress: TEST_MAC.bin2 } }),
    UwbDevice.updateOne({ id: TEST_SECONDARY_ID }, { $set: { macAddress: TEST_MAC.secondary } }),
  ]);
}

function metersToMm(meters: number) {
  return Math.round(meters * 1000);
}

function mmToMeters(mm: number) {
  return Math.round(mm) / 1000;
}

function publicDevice(doc: {
  id: string;
  name: string;
  role: 'tag' | 'primary' | 'secondary';
  chipModel: string;
  chipId: string;
  macAddress?: string;
  forkliftId?: string | null;
  binId?: string | null;
  relayIds?: string[];
  x: number;
  y: number;
  location: string;
  online: boolean;
}) {
  return {
    id: doc.id,
    name: doc.name,
    role: doc.role,
    chipModel: doc.chipModel,
    chipId: doc.chipId,
    macAddress: String(doc.macAddress ?? ''),
    forkliftId: doc.forkliftId ?? null,
    binId: doc.binId ?? null,
    relayIds: doc.relayIds ?? [],
    x: doc.x,
    y: doc.y,
    location: doc.location,
    online: doc.online,
  };
}

const SECONDARIES = [
  {
    id: 'ANC-S-A',
    name: 'Secondary Aisle A',
    chipId: 'QORVO-DWM3001C-SA',
    x: 8,
    y: 8,
    location: 'Aisle A relay',
  },
  {
    id: 'ANC-S-B',
    name: 'Secondary Aisle B',
    chipId: 'QORVO-DWM3001C-SB',
    x: 8,
    y: 22,
    location: 'Aisle B relay',
  },
  {
    id: 'ANC-S-C',
    name: 'Secondary Aisle C',
    chipId: 'QORVO-DWM3001C-SC',
    x: 24,
    y: 14,
    location: 'Aisle C · Receiving relay',
  },
];

const PRIMARY_LAYOUT: Record<string, { x: number; y: number; relayIds: string[] }> = {
  'BIN-001': { x: 4, y: 8, relayIds: ['ANC-S-A'] },
  'BIN-002': { x: 12, y: 8, relayIds: ['ANC-S-A'] },
  'BIN-003': { x: 4, y: 22, relayIds: ['ANC-S-B'] },
  'BIN-004': { x: 12, y: 22, relayIds: ['ANC-S-B'] },
  'BIN-005': { x: 28, y: 14, relayIds: [] },
};

export async function ensureUwbTopology(force = false) {
  if (!force) {
    const [deviceCount, forkliftCount, binCount] = await Promise.all([
      UwbDevice.countDocuments(),
      Forklift.countDocuments(),
      Bin.countDocuments(),
    ]);
    if (deviceCount >= forkliftCount + binCount + SECONDARIES.length) {
      await applyTestChipMacs();
      return;
    }
  }
  for (const secondary of SECONDARIES) {
    await UwbDevice.findOneAndUpdate(
      { id: secondary.id },
      {
        id: secondary.id,
        name: secondary.name,
        role: 'secondary',
        chipModel: 'DWM3001C',
        chipId: secondary.chipId,
        macAddress: secondary.id === TEST_SECONDARY_ID ? TEST_MAC.secondary : '',
        forkliftId: null,
        binId: null,
        relayIds: [],
        x: secondary.x,
        y: secondary.y,
        location: secondary.location,
        online: true,
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  const bins = await Bin.find().sort({ id: 1 }).lean();
  for (const [index, bin] of bins.entries()) {
    const layout = PRIMARY_LAYOUT[bin.id] ?? {
      x: 6 + (index % 5) * 5,
      y: 6 + Math.floor(index / 5) * 8,
      relayIds: [],
    };
    await UwbDevice.findOneAndUpdate(
      { binId: bin.id, role: 'primary' },
      {
        id: `ANC-P-${bin.id.replace(/^BIN-/, '')}`,
        name: `Primary ${bin.name}`,
        role: 'primary',
        chipModel: 'DWM3001C',
        chipId: `QORVO-DWM3001C-P${String(index + 1).padStart(2, '0')}`,
        macAddress:
          bin.id === TEST_BIN_ID ? TEST_MAC.primary : bin.id === TEST_BIN_2_ID ? TEST_MAC.bin2 : '',
        forkliftId: null,
        binId: bin.id,
        relayIds: layout.relayIds,
        x: layout.x,
        y: layout.y,
        location: bin.location,
        online: true,
      },
      { upsert: true, setDefaultsOnInsert: true },
    );
  }

  const forklifts = await Forklift.find().sort({ id: 1 }).lean();
  const start = [
    { x: 10, y: 16 },
    { x: 6, y: 6 },
    { x: 20, y: 12 },
  ];
  for (const [index, machine] of forklifts.entries()) {
    const pos = start[index] ?? { x: 10 + index * 2, y: 12 };
    const existing = await UwbDevice.findOne({ forkliftId: machine.id, role: 'tag' });
    if (existing) {
      existing.name = `Tag ${machine.name}`;
      existing.location = machine.location;
      existing.online = machine.status !== 'Offline';
      if (machine.id === TEST_FORKLIFT_ID) existing.set('macAddress', TEST_MAC.tag);
      await existing.save();
      continue;
    }
    await UwbDevice.create({
      id: `TAG-${machine.id}`,
      name: `Tag ${machine.name}`,
      role: 'tag',
      chipModel: 'DWM3001C',
      chipId: `QORVO-DWM3001C-T${String(index + 1).padStart(2, '0')}`,
      macAddress: machine.id === TEST_FORKLIFT_ID ? TEST_MAC.tag : '',
      forkliftId: machine.id,
      binId: null,
      relayIds: [],
      x: pos.x,
      y: pos.y,
      location: machine.location,
      online: machine.status !== 'Offline',
    });
  }
}

function euclidean(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

async function upsertDummyRange(fromId: string, toId: string, distanceM: number) {
  const existing = await UwbRange.findOne({ pairKey: pairKey(fromId, toId) });
  if (
    existing?.source === 'dwm3001c' &&
    existing.measuredAt &&
    Date.now() - existing.measuredAt.getTime() < CHIP_STALE_MS
  ) {
    return;
  }
  const noiseM = (Math.random() - 0.5) * 0.12;
  await UwbRange.findOneAndUpdate(
    { pairKey: pairKey(fromId, toId) },
    {
      pairKey: pairKey(fromId, toId),
      fromId,
      toId,
      distanceMm: Math.max(50, metersToMm(distanceM + noiseM)),
      quality: 88 + Math.round(Math.random() * 10),
      source: 'dummy',
      measuredAt: new Date(),
    },
    { upsert: true },
  );
}

function neededPairs(tags: Array<{ id: string }>, primaries: Array<{ id: string; relayIds: string[] }>) {
  const pairs = new Set<string>();
  const list: Array<[string, string]> = [];
  for (const tag of tags) {
    for (const primary of primaries) {
      const chain = [tag.id, ...primary.relayIds, primary.id];
      for (let i = 0; i < chain.length - 1; i++) {
        const a = chain[i];
        const b = chain[i + 1];
        const key = pairKey(a, b);
        if (!pairs.has(key)) {
          pairs.add(key);
          list.push([a, b]);
        }
      }
    }
  }
  return list;
}

export async function tickDummyUwb() {
  await ensureUwbTopology();
  const [devices, forklifts, bins] = await Promise.all([
    UwbDevice.find(),
    Forklift.find().lean(),
    Bin.find().lean(),
  ]);
  const byId = new Map(devices.map((d) => [d.id, d]));

  for (const tag of devices.filter((d) => d.role === 'tag')) {
    const machine = forklifts.find((f) => f.id === tag.forkliftId);
    if (!machine || machine.status === 'Offline' || machine.status === 'Maintenance') {
      tag.x = clamp(tag.x + (Math.random() - 0.5) * 0.15, FLOOR.minX, FLOOR.maxX);
      tag.y = clamp(tag.y + (Math.random() - 0.5) * 0.15, FLOOR.minY, FLOOR.maxY);
    } else {
      const bin =
        bins.find((b) => b.name === machine.location || b.id === machine.location) ??
        bins.find((b) => machine.location?.includes(b.name));
      const primary = devices.find((d) => d.role === 'primary' && d.binId === bin?.id);
      const targetX = primary ? primary.x + 1.4 : tag.x;
      const targetY = primary ? primary.y + (machine.status === 'Active' ? 1.2 : 0.4) : tag.y;
      const step = machine.status === 'Active' ? 0.55 : 0.18;
      tag.x = clamp(tag.x + (targetX - tag.x) * 0.22 + (Math.random() - 0.5) * step, FLOOR.minX, FLOOR.maxX);
      tag.y = clamp(tag.y + (targetY - tag.y) * 0.22 + (Math.random() - 0.5) * step, FLOOR.minY, FLOOR.maxY);
    }
    tag.location = machine?.location ?? tag.location;
    tag.online = machine?.status !== 'Offline';
    await tag.save();
  }

  const tags = devices.filter((d) => d.role === 'tag');
  const primaries = devices.filter((d) => d.role === 'primary');
  for (const [fromId, toId] of neededPairs(tags, primaries)) {
    const from = byId.get(fromId);
    const to = byId.get(toId);
    if (!from || !to) continue;
    await upsertDummyRange(fromId, toId, euclidean(from, to));
  }
}

export async function ingestChipRange(fromId: string, toId: string, distanceMm: number) {
  return ingestLiveRange({ fromId, toId, distanceMm });
}

function cmToMm(cm: number) {
  return Math.round(cm * 10);
}

export async function resolveTestDevice(role: string) {
  await ensureUwbTopology();
  const key = String(role ?? '').trim().toLowerCase();
  if (key === 'tag') return UwbDevice.findOne({ role: 'tag', forkliftId: TEST_FORKLIFT_ID });
  if (key === 'primary' || key === 'bin1' || key === 'bin-1') {
    return UwbDevice.findOne({ role: 'primary', binId: TEST_BIN_ID });
  }
  if (key === 'bin2' || key === 'bin-2' || key === 'primary2') {
    return UwbDevice.findOne({ role: 'primary', binId: TEST_BIN_2_ID });
  }
  if (key === 'secondary') return UwbDevice.findOne({ id: TEST_SECONDARY_ID, role: 'secondary' });
  return null;
}

export async function ingestLiveRange(input: {
  fromId?: string;
  toId?: string;
  fromRole?: string;
  toRole?: string;
  distanceM?: number;
  distanceCm?: number;
  distanceMm?: number;
}) {
  let fromId = String(input.fromId ?? '').trim();
  let toId = String(input.toId ?? '').trim();
  if ((!fromId || !toId) && input.fromRole && input.toRole) {
    const [from, to] = await Promise.all([resolveTestDevice(input.fromRole), resolveTestDevice(input.toRole)]);
    fromId = from?.id ?? '';
    toId = to?.id ?? '';
  }
  let distanceMm = Number(input.distanceMm);
  if (!Number.isFinite(distanceMm) || distanceMm <= 0) {
    if (Number.isFinite(Number(input.distanceM)) && Number(input.distanceM) > 0) {
      distanceMm = metersToMm(Number(input.distanceM));
    } else if (Number.isFinite(Number(input.distanceCm)) && Number(input.distanceCm) > 0) {
      distanceMm = cmToMm(Number(input.distanceCm));
    }
  }
  if (!fromId || !toId || !Number.isFinite(distanceMm) || distanceMm <= 0) {
    throw new Error('from/to roles or ids, and a positive distance, are required');
  }
  if (distanceMm >= 655350) {
    throw new Error('Invalid UWB distance (timeout)');
  }
  const doc = await UwbRange.findOneAndUpdate(
    { pairKey: pairKey(fromId, toId) },
    {
      pairKey: pairKey(fromId, toId),
      fromId,
      toId,
      distanceMm: Math.round(distanceMm),
      quality: 99,
      source: 'dwm3001c',
      measuredAt: new Date(),
    },
    { upsert: true, new: true },
  );
  await UwbDevice.updateMany({ id: { $in: [fromId, toId] } }, { online: true });
  return {
    pairKey: doc.pairKey,
    fromId: doc.fromId,
    toId: doc.toId,
    distanceM: mmToMeters(doc.distanceMm),
    distanceMm: doc.distanceMm,
    source: doc.source,
    measuredAt: doc.measuredAt,
  };
}

export async function getUwbTestCase() {
  const settings = await Settings.findOne({ key: 'warehouse' });
  return settings?.uwbTestCase === 'A' ? 'A' : 'C';
}

export async function setUwbTestCase(testCase: string) {
  const next = testCase === 'A' ? 'A' : 'C';
  await Settings.findOneAndUpdate(
    { key: 'warehouse' },
    { uwbTestCase: next, lastUpdated: new Date().toISOString() },
    { upsert: true },
  );
  return getUwbMapping();
}

export async function restartTwoBinTest() {
  await ensureUwbTopology(true);
  await applyTestChipMacs();
  await UwbRange.deleteMany({ source: 'dwm3001c' });
  await Settings.findOneAndUpdate(
    { key: 'warehouse' },
    { uwbTestCase: 'C', lastUpdated: new Date().toISOString() },
    { upsert: true },
  );
  return getUwbMapping();
}

async function seedStaticRanges() {
  await ensureUwbTopology();
  if ((await UwbRange.countDocuments()) > 0) return;
  const devices = await UwbDevice.find();
  const byId = new Map(devices.map((d) => [d.id, d]));
  const tags = devices.filter((d) => d.role === 'tag');
  const primaries = devices.filter((d) => d.role === 'primary');
  for (const [fromId, toId] of neededPairs(tags, primaries)) {
    const from = byId.get(fromId);
    const to = byId.get(toId);
    if (!from || !to) continue;
    await UwbRange.findOneAndUpdate(
      { pairKey: pairKey(fromId, toId) },
      {
        pairKey: pairKey(fromId, toId),
        fromId,
        toId,
        distanceMm: Math.max(50, metersToMm(euclidean(from, to))),
        quality: 95,
        source: 'dummy',
        measuredAt: new Date(),
      },
      { upsert: true },
    );
  }
}

export async function setMappingDistance(tagId: string, primaryId: string, distanceM: number) {
  const tag = String(tagId ?? '').trim();
  const primary = String(primaryId ?? '').trim();
  if (!tag || !primary) {
    throw new Error('tagId and primaryId are required');
  }
  if (!Number.isFinite(distanceM) || distanceM < 0) {
    throw new Error('Distance must be a number of 0 m or more');
  }
  const [tagDevice, primaryDevice] = await Promise.all([
    UwbDevice.findOne({ id: tag, role: 'tag' }).lean(),
    UwbDevice.findOne({ id: primary, role: 'primary' }).lean(),
  ]);
  if (!tagDevice || !primaryDevice) {
    throw new Error('Unknown tag or primary anchor');
  }
  await UwbDistance.findOneAndUpdate(
    { key: mappingKey(tag, primary) },
    {
      key: mappingKey(tag, primary),
      tagId: tag,
      primaryId: primary,
      distanceM: Math.round(distanceM * 1000) / 1000,
    },
    { upsert: true },
  );
  return getUwbMapping();
}

export async function getUwbMapping() {
  await seedStaticRanges();
  const [devices, ranges, distances, forklifts, bins, testCase] = await Promise.all([
    UwbDevice.find().lean(),
    UwbRange.find().lean(),
    UwbDistance.find().lean(),
    Forklift.find().lean(),
    Bin.find().lean(),
    getUwbTestCase(),
  ]);
  const overrideByKey = new Map(distances.map((row) => [row.key, row.distanceM]));

  const rangeByPair = new Map(ranges.map((r) => [r.pairKey, r]));
  const deviceById = new Map(devices.map((d) => [d.id, d]));
  const tags = devices.filter((d) => d.role === 'tag');
  const primaries = devices.filter((d) => d.role === 'primary');

  const mappings = [];
  for (const tag of tags) {
    const machine = forklifts.find((f) => f.id === tag.forkliftId);
    for (const primary of primaries) {
      const bin = bins.find((b) => b.id === primary.binId);
      const relays =
        primary.binId === TEST_BIN_ID || primary.binId === TEST_BIN_2_ID
          ? testCase === 'A'
            ? [TEST_SECONDARY_ID]
            : []
          : (primary.relayIds ?? []);
      const chain = [tag.id, ...relays, primary.id];
      const hops = [];
      let totalMm = 0;
      let missing = false;
      let latest = 0;
      let liveChip = false;

      for (let i = 0; i < chain.length - 1; i++) {
        const fromId = chain[i];
        const toId = chain[i + 1];
        const from = deviceById.get(fromId);
        const to = deviceById.get(toId);
        const sample = rangeByPair.get(pairKey(fromId, toId));
        if (!from || !to || !sample) {
          missing = true;
          break;
        }
        totalMm += sample.distanceMm;
        latest = Math.max(latest, new Date(sample.measuredAt).getTime());
        if (sample.source === 'dwm3001c') liveChip = true;
        hops.push({
          fromId: from.id,
          fromName: from.name,
          fromRole: from.role,
          toId: to.id,
          toName: to.name,
          toRole: to.role,
          distanceM: mmToMeters(sample.distanceMm),
          distanceMm: sample.distanceMm,
          source: sample.source === 'dwm3001c' ? 'dwm3001c' : 'dummy',
        });
      }

      const override = liveChip ? undefined : overrideByKey.get(mappingKey(tag.id, primary.id));
      const computed = missing ? 0 : mmToMeters(totalMm);
      const totalDistanceM = override !== undefined ? override : computed;
      mappings.push({
        forkliftId: tag.forkliftId ?? '',
        forkliftName: machine?.name ?? tag.name,
        tagId: tag.id,
        tagName: tag.name,
        chipId: tag.chipId,
        binId: primary.binId ?? '',
        binName: bin?.name ?? primary.name,
        primaryId: primary.id,
        primaryName: primary.name,
        hops,
        totalDistanceM,
        hopCount: Math.max(0, chain.length - 2),
        isNearest: false,
        status: override !== undefined || !missing ? 'ok' : 'no-signal',
        updatedAt: latest ? new Date(latest).toISOString() : new Date().toISOString(),
      });
    }
  }

  const byTag = new Map<string, { live: number | null; any: number | null }>();
  for (const row of mappings) {
    if (row.status !== 'ok') continue;
    const live = row.hops.some(
      (hop) => hop.source === 'dwm3001c' && Date.now() - new Date(row.updatedAt).getTime() < CHIP_STALE_MS,
    );
    const current = byTag.get(row.tagId) ?? { live: null, any: null };
    if (current.any === null || row.totalDistanceM < current.any) current.any = row.totalDistanceM;
    if (live && (current.live === null || row.totalDistanceM < current.live)) current.live = row.totalDistanceM;
    byTag.set(row.tagId, current);
  }
  for (const row of mappings) {
    const best = byTag.get(row.tagId);
    const target = best?.live ?? best?.any;
    const live = row.hops.some(
      (hop) => hop.source === 'dwm3001c' && Date.now() - new Date(row.updatedAt).getTime() < CHIP_STALE_MS,
    );
    row.isNearest =
      row.status === 'ok' &&
      target !== null &&
      target !== undefined &&
      row.totalDistanceM === target &&
      (best?.live == null || live);
  }

  const chipLive = ranges.some(
    (r) => r.source === 'dwm3001c' && r.measuredAt && Date.now() - new Date(r.measuredAt).getTime() < CHIP_STALE_MS,
  );

  return {
    source: chipLive ? 'dwm3001c' : 'dummy',
    chip: CHIP,
    testCase,
    updatedAt: new Date().toISOString(),
    devices: devices.map(publicDevice),
    mappings: mappings.sort((a, b) => {
      if (a.forkliftName !== b.forkliftName) return a.forkliftName.localeCompare(b.forkliftName);
      return a.totalDistanceM - b.totalDistanceM;
    }),
  };
}

export function startDummyUwb() {
  const kick = () => {
    tickDummyUwb().catch((err) => console.error('UWB dummy tick failed', err));
  };
  kick();
  const timer = setInterval(kick, 2500);
  timer.unref?.();
  return timer;
}
