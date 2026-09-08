export type AssetStatus = "Active" | "UnderRepair" | "Lost" | "Scrapped";
export type HardwareKind = "qr" | "rfid" | "barcode";
export type LocationKind = "plant" | "warehouse" | "zone";
export type PartnerKind = "customer" | "supplier";
export type Severity = "Info" | "Warning" | "Critical";

export type ProjectMeta = {
  id: string;
  name: string;
  shortName: string;
  codePrefix: string;
  accent: string;
  daisyTheme: string;
  primary: string;
  secondary: string;
  industry: string;
  createdAt: string;
  seedDemo: boolean;
};

export type LocationNode = {
  id: string;
  name: string;
  kind: LocationKind;
  parentId: string | null;
  active: boolean;
};

export type Department = {
  id: string;
  name: string;
  plantId: string;
};

export type Category = {
  id: string;
  code: string;
  name: string;
  description: string;
  materialClass: string;
  lengthMm: number;
  cleaning: string;
  frequencyCycles: number;
  maxLifespanMonths: number;
  defaultVendorId: string | null;
  triggerMaintenance: boolean;
  maxTransitHrs: number;
  dwellLimitHrs: number;
  geoFencing: boolean;
  enforceBounds: boolean;
  inspectionCheckpoints: boolean;
  replacementCost: number;
  rulesCount: number;
  active: boolean;
};

export type MovementType = {
  id: string;
  code: string;
  name: string;
  from: string;
  to: string;
  requiresApproval: boolean;
};

export type Partner = {
  id: string;
  code: string;
  name: string;
  category: string;
  city: string;
  state: string;
  country: string;
  contact: string;
  active: boolean;
  assetsOnSite: number;
  kind: PartnerKind;
};

export type Uom = {
  id: string;
  code: string;
  name: string;
  category: string;
  active: boolean;
  usedBy: number;
};

export type Asset = {
  id: string;
  code: string;
  numericId: number;
  categoryId: string;
  status: AssetStatus;
  locationLabel: string;
  locationKind: "warehouse" | "customer" | "transit" | "supplier" | "plant" | "repair";
  locationId: string | null;
  hardware: HardwareKind[];
  agingDays: number;
  manufacturingDate: string | null;
  expiryDate: string | null;
  lastSeen: string;
  replacementCost: number;
};

export type CycleCount = {
  id: string;
  name: string;
  warehouseName: string;
  categoryName: string;
  started: string;
  completed: string | null;
  found: number;
  missing: number;
  unexpected: number;
  status: "In Progress" | "Completed";
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  status: "Active" | "Invited" | "Disabled";
  initials: string;
};

export type AppNotification = {
  id: string;
  assetCode: string;
  category: string;
  type: string;
  severity: Severity;
  triggered: string;
  status: "Open" | "Acknowledged";
};

export type EventLog = {
  id: string;
  message: string;
  detail: string;
  time: string;
  level: "Info" | "Warn";
};

export type HardwareDevice = {
  id: string;
  name: string;
  kind: "RFID Reader" | "Handheld" | "Gateway";
  zoneName: string;
  status: "Online" | "Offline" | "Unassigned";
  lastPing: string | null;
};

export type LabelElementType =
  | "text"
  | "field"
  | "datetime"
  | "serial"
  | "barcode"
  | "qr"
  | "logo"
  | "line"
  | "rect"
  | "circle";

export type LabelElement = {
  id: string;
  type: LabelElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  fontSize: number;
  bold: boolean;
  bindField: string;
  symbology: string;
};

export type LabelTemplate = {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  description: string;
  isDefault: boolean;
  status: "Draft" | "Published";
  elements: LabelElement[];
};

export type ProjectData = {
  meta: ProjectMeta;
  locations: LocationNode[];
  departments: Department[];
  categories: Category[];
  movementTypes: MovementType[];
  customers: Partner[];
  suppliers: Partner[];
  uoms: Uom[];
  assets: Asset[];
  cycleCounts: CycleCount[];
  users: AppUser[];
  notifications: AppNotification[];
  events: EventLog[];
  hardware: HardwareDevice[];
  labels: LabelTemplate[];
};

export type PersistShape = {
  activeId: string;
  projects: ProjectData[];
  theme: "dark" | "light";
};
