import { Bin } from '../models/Bin';
import { Forklift } from '../models/Forklift';
import { UwbDevice } from '../models/UwbDevice';
import { UwbRange } from '../models/UwbRange';

const CHIP = 'Qorvo DWM3001C';
const CHIP_STALE_MS = 15_000;
const FLOOR = { minX: 1, maxX: 31, minY: 1, maxY: 27 };

export function pairKey(a: string, b: string) {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
    if (deviceCount >= forkliftCount + binCount + SECONDARIES.length) return;
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
      await existing.save();
      continue;
    }
    await UwbDevice.create({
      id: `TAG-${machine.id}`,
      name: `Tag ${machine.name}`,
      role: 'tag',
      chipModel: 'DWM3001C',
      chipId: `QORVO-DWM3001C-T${String(index + 1).padStart(2, '0')}`,
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
  if (!fromId || !toId || !Number.isFinite(distanceMm) || distanceMm <= 0) {
    throw new Error('fromId, toId, and a positive distanceMm are required');
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
  return doc;
}

export async function getUwbMapping() {
  await ensureUwbTopology();
  if ((await UwbRange.countDocuments()) === 0) {
    await tickDummyUwb();
  }
  const [devices, ranges, forklifts, bins] = await Promise.all([
    UwbDevice.find().lean(),
    UwbRange.find().lean(),
    Forklift.find().lean(),
    Bin.find().lean(),
  ]);

  const rangeByPair = new Map(ranges.map((r) => [r.pairKey, r]));
  const deviceById = new Map(devices.map((d) => [d.id, d]));
  const tags = devices.filter((d) => d.role === 'tag');
  const primaries = devices.filter((d) => d.role === 'primary');

  const mappings = [];
  for (const tag of tags) {
    const machine = forklifts.find((f) => f.id === tag.forkliftId);
    for (const primary of primaries) {
      const bin = bins.find((b) => b.id === primary.binId);
      const chain = [tag.id, ...(primary.relayIds ?? []), primary.id];
      const hops = [];
      let totalMm = 0;
      let missing = false;
      let latest = 0;

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
        totalDistanceM: missing ? 0 : mmToMeters(totalMm),
        hopCount: Math.max(0, chain.length - 2),
        isNearest: false,
        status: missing ? 'no-signal' : 'ok',
        updatedAt: latest ? new Date(latest).toISOString() : new Date().toISOString(),
      });
    }
  }

  const byTag = new Map<string, number>();
  for (const row of mappings) {
    if (row.status !== 'ok') continue;
    const current = byTag.get(row.tagId);
    if (current === undefined || row.totalDistanceM < current) {
      byTag.set(row.tagId, row.totalDistanceM);
    }
  }
  for (const row of mappings) {
    row.isNearest = row.status === 'ok' && byTag.get(row.tagId) === row.totalDistanceM;
  }

  const chipLive = ranges.some(
    (r) => r.source === 'dwm3001c' && r.measuredAt && Date.now() - new Date(r.measuredAt).getTime() < CHIP_STALE_MS,
  );

  return {
    source: chipLive ? 'dwm3001c' : 'dummy',
    chip: CHIP,
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
