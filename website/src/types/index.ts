export type LoginMethod = 'email' | 'mobile';

export type UserRole = 'admin' | 'supervisor' | 'operator';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
  password?: string;
  role: UserRole;
  createdAt: string;
}

export interface PendingVerification {
  identifier: string;
  method: LoginMethod;
  otp: string;
  createdAt: number;
  userId: string;
}

export interface AuthState {
  currentUser: AppUser | null;
  isAuthenticated: boolean;
  users: AppUser[];
  pendingVerification: PendingVerification | null;
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

export type ProductStatus = 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Reserved';

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  quantity: number;
  binId: string;
  status: ProductStatus;
  lastUpdated: string;
}

export type BinStatus = 'Available' | 'Occupied' | 'Full' | 'Maintenance';

export interface Bin {
  id: string;
  name: string;
  capacity: number;
  location: string;
  status: BinStatus;
  productCount: number;
}

export type ForkliftStatus = 'Active' | 'Idle' | 'Maintenance' | 'Offline';

export interface Forklift {
  id: string;
  name: string;
  model: string;
  capacity: string;
  status: ForkliftStatus;
  operator: string;
  battery: number;
  location: string;
  lastActive: string;
}

export type SessionStatus = 'Active' | 'Logged Out';

export interface UserSession {
  id: string;
  userName: string;
  email: string;
  forkliftId: string;
  forkliftName: string;
  loginTime: string;
  logoutTime: string | null;
  status: SessionStatus;
  date: string;
}

export type EventType = 'forklift' | 'product' | 'user' | 'bin' | 'inventory' | 'scan';

export interface ActivityEvent {
  id: string;
  time: string;
  timestamp: number;
  type: EventType;
  message: string;
}

export interface TimeSeriesPoint {
  time: string;
  quantity: number;
  inbound: number;
  outbound: number;
  activity: number;
}

export interface ForkliftActivityPoint {
  name: string;
  trips: number;
  idle: number;
}

export interface WarehouseState {
  categories: Category[];
  products: Product[];
  bins: Bin[];
  forklifts: Forklift[];
  users: AppUser[];
  userSessions: UserSession[];
  events: ActivityEvent[];
  inventoryHistory: TimeSeriesPoint[];
  lastUpdated: string;
  livePaused: boolean;
}

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral'
  | 'info'
  | 'accent';

export type UwbRole = 'tag' | 'primary' | 'secondary';

export type UwbRangeSource = 'dummy' | 'dwm3001c';

export interface UwbDevice {
  id: string;
  name: string;
  role: UwbRole;
  chipModel: string;
  chipId: string;
  macAddress?: string;
  forkliftId: string | null;
  binId: string | null;
  relayIds: string[];
  x: number;
  y: number;
  location: string;
  online: boolean;
}

export interface UwbHop {
  fromId: string;
  fromName: string;
  fromRole: UwbRole;
  toId: string;
  toName: string;
  toRole: UwbRole;
  distanceM: number;
  distanceMm: number;
  source: UwbRangeSource;
}

export interface UwbMapping {
  forkliftId: string;
  forkliftName: string;
  tagId: string;
  tagName: string;
  chipId: string;
  binId: string;
  binName: string;
  primaryId: string;
  primaryName: string;
  hops: UwbHop[];
  totalDistanceM: number;
  hopCount: number;
  isNearest: boolean;
  status: 'ok' | 'no-signal';
  updatedAt: string;
}

export interface UwbMappingResponse {
  source: UwbRangeSource;
  chip: string;
  testCase?: 'A' | 'C';
  updatedAt: string;
  devices: UwbDevice[];
  mappings: UwbMapping[];
}
