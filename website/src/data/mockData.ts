import type {
  AppUser,
  Bin,
  Category,
  Forklift,
  Product,
  TimeSeriesPoint,
  UserSession,
  WarehouseState,
  ActivityEvent,
} from '../types';

export const DEV_OTP = '123456';

export const seedUsers: AppUser[] = [
  {
    id: 'usr-001',
    name: 'Admin Operator',
    email: 'admin@forklift.com',
    mobile: '9876543210',
    password: 'password123',
    role: 'admin',
    createdAt: '2026-04-12T08:00:00.000Z',
  },
];

function hoursAgo(hours: number, minutes = 0): string {
  const d = new Date();
  d.setHours(d.getHours() - hours, d.getMinutes() - minutes, 0, 0);
  return d.toISOString();
}

function timeLabel(hoursBack: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hoursBack, 0, 0, 0);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export const seedCategories: Category[] = [
  { id: 'cat-001', name: '1 Ton', description: 'Heavy-duty components rated up to 1 ton' },
  { id: 'cat-002', name: '1/2 Ton', description: 'Medium assemblies and half-ton inventory' },
];

export const seedProducts: Product[] = [
  { id: 'P-001', name: 'Steel Component', categoryId: 'cat-001', quantity: 150, binId: 'BIN-001', status: 'In Stock', lastUpdated: hoursAgo(0, 12) },
  { id: 'P-002', name: 'Industrial Assembly', categoryId: 'cat-002', quantity: 230, binId: 'BIN-002', status: 'In Stock', lastUpdated: hoursAgo(0, 28) },
  { id: 'P-003', name: 'Heavy Component', categoryId: 'cat-001', quantity: 85, binId: 'BIN-003', status: 'In Stock', lastUpdated: hoursAgo(1, 5) },
  { id: 'P-004', name: 'Hydraulic Frame', categoryId: 'cat-001', quantity: 42, binId: 'BIN-001', status: 'Low Stock', lastUpdated: hoursAgo(0, 44) },
  { id: 'P-005', name: 'Drive Coupling', categoryId: 'cat-002', quantity: 310, binId: 'BIN-004', status: 'In Stock', lastUpdated: hoursAgo(2, 10) },
  { id: 'P-006', name: 'Mast Bracket', categoryId: 'cat-001', quantity: 18, binId: 'BIN-005', status: 'Low Stock', lastUpdated: hoursAgo(0, 8) },
  { id: 'P-007', name: 'Counterweight Plate', categoryId: 'cat-001', quantity: 0, binId: 'BIN-003', status: 'Out of Stock', lastUpdated: hoursAgo(3, 20) },
  { id: 'P-008', name: 'Fork Carriage', categoryId: 'cat-002', quantity: 64, binId: 'BIN-002', status: 'Reserved', lastUpdated: hoursAgo(0, 16) },
  { id: 'P-009', name: 'Tilt Cylinder', categoryId: 'cat-001', quantity: 96, binId: 'BIN-004', status: 'In Stock', lastUpdated: hoursAgo(1, 40) },
  { id: 'P-010', name: 'Load Backrest', categoryId: 'cat-002', quantity: 128, binId: 'BIN-005', status: 'In Stock', lastUpdated: hoursAgo(0, 55) },
];

export const seedBins: Bin[] = [
  { id: 'BIN-001', name: 'Bin 1', capacity: 20, location: 'Aisle A · Zone 1', status: 'Occupied', productCount: 2 },
  { id: 'BIN-002', name: 'Bin 2', capacity: 20, location: 'Aisle A · Zone 2', status: 'Occupied', productCount: 2 },
  { id: 'BIN-003', name: 'Bin 3', capacity: 40, location: 'Aisle B · Zone 1', status: 'Occupied', productCount: 2 },
  { id: 'BIN-004', name: 'Bin 4', capacity: 50, location: 'Aisle B · Zone 2', status: 'Occupied', productCount: 2 },
  { id: 'BIN-005', name: 'Bin 5', capacity: 30, location: 'Aisle C · Receiving', status: 'Occupied', productCount: 2 },
];

export const seedForklifts: Forklift[] = [
  { id: 'FLT-001', name: 'Machine 1', model: 'Hyster H2.5FT', capacity: '2.5 Ton', status: 'Active', operator: 'John Doe', battery: 82, location: 'Bin 3', lastActive: hoursAgo(0, 2) },
  { id: 'FLT-002', name: 'Machine 2', model: 'Toyota 8FGCU25', capacity: '2.0 Ton', status: 'Idle', operator: 'Sarah Smith', battery: 64, location: 'Bin 1', lastActive: hoursAgo(0, 18) },
  { id: 'FLT-003', name: 'Machine 3', model: 'Crown C-5', capacity: '1.8 Ton', status: 'Maintenance', operator: 'Unassigned', battery: 41, location: 'Service Bay', lastActive: hoursAgo(4, 12) },
];

export const seedSessions: UserSession[] = [
  { id: 'ses-001', userName: 'John Doe', email: 'john@example.com', forkliftId: 'FLT-001', forkliftName: 'Machine 1', loginTime: '09:12 AM', logoutTime: null, status: 'Active', date: new Date().toISOString().slice(0, 10) },
  { id: 'ses-002', userName: 'Sarah Smith', email: 'sarah@example.com', forkliftId: 'FLT-002', forkliftName: 'Machine 2', loginTime: '08:40 AM', logoutTime: '01:15 PM', status: 'Logged Out', date: new Date().toISOString().slice(0, 10) },
  { id: 'ses-003', userName: 'Mike Johnson', email: 'mike@example.com', forkliftId: 'FLT-001', forkliftName: 'Machine 1', loginTime: '07:55 AM', logoutTime: '05:42 PM', status: 'Logged Out', date: new Date().toISOString().slice(0, 10) },
  { id: 'ses-004', userName: 'Priya Mehta', email: 'priya@example.com', forkliftId: 'FLT-002', forkliftName: 'Machine 2', loginTime: '09:30 AM', logoutTime: null, status: 'Active', date: new Date().toISOString().slice(0, 10) },
  { id: 'ses-005', userName: 'David Chen', email: 'david@example.com', forkliftId: 'FLT-003', forkliftName: 'Machine 3', loginTime: '06:20 AM', logoutTime: '11:05 AM', status: 'Logged Out', date: new Date().toISOString().slice(0, 10) },
  { id: 'ses-006', userName: 'Anita Rao', email: 'anita@example.com', forkliftId: 'FLT-001', forkliftName: 'Machine 1', loginTime: '10:04 AM', logoutTime: null, status: 'Active', date: new Date().toISOString().slice(0, 10) },
  { id: 'ses-007', userName: 'Omar Khalid', email: 'omar@example.com', forkliftId: 'FLT-002', forkliftName: 'Machine 2', loginTime: '08:10 AM', logoutTime: null, status: 'Active', date: new Date().toISOString().slice(0, 10) },
  { id: 'ses-008', userName: 'Elena Rossi', email: 'elena@example.com', forkliftId: 'FLT-001', forkliftName: 'Machine 1', loginTime: '07:12 AM', logoutTime: '04:18 PM', status: 'Logged Out', date: new Date().toISOString().slice(0, 10) },
];

export const seedEvents: ActivityEvent[] = [
  { id: 'evt-001', time: '09:42', timestamp: Date.now() - 2 * 60_000, type: 'forklift', message: 'Machine 1 moved to Bin 3' },
  { id: 'evt-002', time: '09:38', timestamp: Date.now() - 6 * 60_000, type: 'product', message: 'Product P-104 added to Bin 2' },
  { id: 'evt-003', time: '09:31', timestamp: Date.now() - 13 * 60_000, type: 'user', message: 'John Doe logged in' },
  { id: 'evt-004', time: '09:25', timestamp: Date.now() - 19 * 60_000, type: 'inventory', message: 'Bin 4 inventory updated' },
  { id: 'evt-005', time: '09:12', timestamp: Date.now() - 32 * 60_000, type: 'bin', message: 'Bin 1 capacity recalculated' },
  { id: 'evt-006', time: '08:58', timestamp: Date.now() - 46 * 60_000, type: 'forklift', message: 'Machine 2 returned to idle at Bin 1' },
];

export const seedHistory: TimeSeriesPoint[] = Array.from({ length: 12 }, (_, i) => {
  const hour = 11 - i;
  const base = 23200 + Math.round(Math.sin(i / 2) * 420) + i * 90;
  return {
    time: timeLabel(hour),
    quantity: base,
    inbound: 40 + ((i * 13) % 55),
    outbound: 28 + ((i * 9) % 48),
    activity: 12 + ((i * 7) % 24),
  };
}).reverse();

export function createSeedWarehouse(): WarehouseState {
  return {
    categories: seedCategories,
    products: seedProducts,
    bins: seedBins,
    forklifts: seedForklifts,
    users: seedUsers.map(({ password: _password, ...user }) => user),
    userSessions: seedSessions,
    events: seedEvents,
    inventoryHistory: seedHistory,
    lastUpdated: new Date().toISOString(),
    livePaused: false,
  };
}

export const LIVE_EVENT_POOL: Array<{ type: ActivityEvent['type']; message: string }> = [
  { type: 'forklift', message: 'Machine 1 moved to Bin 3' },
  { type: 'forklift', message: 'Machine 2 completed pick at Bin 1' },
  { type: 'product', message: 'Product P-001 restocked in Bin 1' },
  { type: 'product', message: 'Product P-006 picked from Bin 5' },
  { type: 'user', message: 'Priya Mehta scanned in at dock' },
  { type: 'inventory', message: 'Bin 4 inventory updated' },
  { type: 'bin', message: 'Bin 2 utilization recalculated' },
  { type: 'forklift', message: 'Machine 1 battery cycle recorded' },
  { type: 'inventory', message: 'Reserved stock released for P-008' },
  { type: 'user', message: 'Omar Khalid started a transfer job' },
];
