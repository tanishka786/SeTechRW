import { ActivityEvent } from '../models/ActivityEvent';
import { Bin } from '../models/Bin';
import { Category } from '../models/Category';
import { Forklift } from '../models/Forklift';
import { InventoryMovement } from '../models/InventoryMovement';
import { Product } from '../models/Product';
import { ScanEvent } from '../models/ScanEvent';
import { User } from '../models/User';
import { UserLoginActivity } from '../models/UserLoginActivity';
import { getSettings } from './liveSim';

function leanId<T extends { id: string }>(docs: T[]) {
  return docs.map((d) => ({ ...d }));
}

export async function warehouseState() {
  const [categories, products, bins, forklifts, users, userSessions, events, inventoryHistory, settings] =
    await Promise.all([
      Category.find().sort({ name: 1 }).lean(),
      Product.find().sort({ id: 1 }).lean(),
      Bin.find().sort({ id: 1 }).lean(),
      Forklift.find().sort({ id: 1 }).lean(),
      User.find().select('id name email mobile role createdAt').sort({ name: 1 }).lean(),
      UserLoginActivity.find().sort({ createdAt: -1 }).lean(),
      ActivityEvent.find().sort({ timestamp: -1 }).limit(20).lean(),
      InventoryMovement.find().sort({ createdAt: 1 }).lean(),
      getSettings(),
    ]);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const [scansToday, unmatchedToday] = await Promise.all([
    ScanEvent.countDocuments({ createdAt: { $gte: start } }),
    ScanEvent.countDocuments({ createdAt: { $gte: start }, status: 'Not Found' }),
  ]);

  const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
  const utilization =
    bins.length === 0 ? 0 : Math.round(bins.reduce((sum, b) => sum + b.capacity, 0) / bins.length);

  return {
    categories: leanId(categories),
    products: leanId(products),
    bins: leanId(bins),
    forklifts: leanId(forklifts),
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      createdAt: user.createdAt?.toISOString() ?? new Date().toISOString(),
    })),
    userSessions: leanId(userSessions),
    events: leanId(events),
    inventoryHistory,
    lastUpdated: settings.lastUpdated,
    livePaused: settings.livePaused,
    scanStats: { today: scansToday, unmatchedToday },
    summary: {
      totalProducts: products.length,
      binCount: bins.length,
      activeForklifts: forklifts.filter((f) => f.status === 'Active').length,
      activeUsers: userSessions.filter((s) => s.status === 'Active').length,
      totalQuantity,
      utilization,
      occupiedBins: bins.filter((b) => b.capacity >= 40).length,
      lowStock: products.filter((p) => p.status === 'Low Stock').length,
      reserved: products.filter((p) => p.status === 'Reserved').length,
      available: products.filter((p) => p.status === 'In Stock').length,
      scansToday,
      unmatchedToday,
    },
  };
}
