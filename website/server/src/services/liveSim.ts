import { ActivityEvent } from '../models/ActivityEvent';
import { Bin } from '../models/Bin';
import { Forklift } from '../models/Forklift';
import { InventoryMovement } from '../models/InventoryMovement';
import { Product } from '../models/Product';
import { Settings } from '../models/Settings';

const EVENT_POOL = [
  { type: 'forklift' as const, message: 'Machine 1 moved to Bin 3' },
  { type: 'forklift' as const, message: 'Machine 2 completed pick at Bin 1' },
  { type: 'product' as const, message: 'Product P-001 restocked in Bin 1' },
  { type: 'inventory' as const, message: 'Bin 4 inventory updated' },
  { type: 'bin' as const, message: 'Bin 2 utilization recalculated' },
  { type: 'scan' as const, message: 'QR label from Print queue verified' },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function deriveStatus(quantity: number, current?: string) {
  if (current === 'Reserved' && quantity > 0) return 'Reserved';
  if (quantity <= 0) return 'Out of Stock';
  if (quantity < 50) return 'Low Stock';
  return 'In Stock';
}

function deriveBinStatus(capacity: number, current?: string) {
  if (current === 'Maintenance') return 'Maintenance';
  if (capacity >= 95) return 'Full';
  if (capacity >= 40) return 'Occupied';
  return 'Available';
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export async function getSettings() {
  return (
    (await Settings.findOne({ key: 'warehouse' })) ??
    (await Settings.create({ key: 'warehouse', livePaused: false, lastUpdated: new Date().toISOString() }))
  );
}

export async function tickLiveData() {
  const settings = await getSettings();
  if (settings.livePaused) return;

  const forklifts = await Forklift.find();
  const bins = await Bin.find();
  const locations = bins.map((b) => b.name);

  for (const f of forklifts) {
    if (f.status === 'Offline' || f.status === 'Maintenance') {
      f.battery = Math.round(clamp(f.battery - 0.2, 8, 100));
    } else {
      const drift = f.status === 'Active' ? -1.1 : -0.3;
      f.battery = Math.round(clamp(f.battery + drift + Math.random() * 0.6 - 0.2, 12, 98));
      if (f.status === 'Active' && locations.length && Math.random() > 0.72) {
        f.location = locations[Math.floor(Math.random() * locations.length)] ?? f.location;
        f.lastActive = new Date().toISOString();
      }
    }
    await f.save();
  }

  const products = await Product.find();
  const slot = Math.floor(Date.now() / 4000) % 4;
  for (const [index, product] of products.entries()) {
    if (index % 4 !== slot) continue;
    product.quantity = Math.max(0, product.quantity + Math.round(Math.random() * 4 - 1.5));
    product.status = deriveStatus(product.quantity, product.status);
    product.lastUpdated = new Date().toISOString();
    await product.save();
  }

  const refreshed = await Product.find();
  for (const bin of bins) {
    bin.productCount = refreshed.filter((p) => p.binId === bin.id).length;
    bin.status = deriveBinStatus(bin.capacity, bin.status);
    await bin.save();
  }

  const totalQty = refreshed.reduce((sum, p) => sum + p.quantity, 0);
  const last = await InventoryMovement.findOne().sort({ createdAt: -1 });
  await InventoryMovement.create({
    time: formatTime(),
    quantity: Math.max(totalQty, last?.quantity ?? totalQty),
    inbound: 20 + Math.round(Math.random() * 50),
    outbound: 15 + Math.round(Math.random() * 45),
    activity: 8 + Math.round(Math.random() * 20),
  });
  const extras = await InventoryMovement.find().sort({ createdAt: -1 }).skip(14);
  if (extras.length) {
    await InventoryMovement.deleteMany({ _id: { $in: extras.map((e) => e._id) } });
  }

  if (Math.random() > 0.45) {
    const sample = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)];
    if (sample) {
      await ActivityEvent.create({
        id: `evt-${Date.now()}`,
        time: formatTime(),
        timestamp: Date.now(),
        type: sample.type,
        message: sample.message,
      });
      const old = await ActivityEvent.find().sort({ timestamp: -1 }).skip(20);
      if (old.length) await ActivityEvent.deleteMany({ _id: { $in: old.map((e) => e._id) } });
    }
  }

  settings.lastUpdated = new Date().toISOString();
  await settings.save();
}

export function startLiveSimulation() {
  const timer = setInterval(() => {
    tickLiveData().catch((err) => console.error('live tick failed', err));
  }, 5000);
  timer.unref?.();
  return timer;
}
