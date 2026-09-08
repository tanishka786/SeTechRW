import type {
  Asset,
  Category,
  Partner,
  ProjectData,
  ProjectMeta,
} from "./types";

const id = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}`;

export function blankProject(meta: ProjectMeta): ProjectData {
  return {
    meta,
    locations: [],
    departments: [],
    categories: [],
    movementTypes: [
      { id: id(), code: "INB", name: "Inbound to plant", from: "Supplier", to: "Warehouse", requiresApproval: false },
      { id: id(), code: "DSP", name: "Dispatch to customer", from: "Warehouse", to: "Customer", requiresApproval: true },
      { id: id(), code: "RET", name: "Return to plant", from: "Customer", to: "Warehouse", requiresApproval: false },
      { id: id(), code: "MNT", name: "Send to maintenance", from: "Any", to: "Repair", requiresApproval: true },
    ],
    customers: [],
    suppliers: [],
    uoms: [
      { id: id(), code: "pcs", name: "Pieces", category: "Count", active: true, usedBy: 0 },
      { id: id(), code: "kg", name: "Kilogram", category: "Weight", active: true, usedBy: 0 },
      { id: id(), code: "ltr", name: "Litre", category: "Volume", active: true, usedBy: 0 },
      { id: id(), code: "mm", name: "Millimetre", category: "Length", active: true, usedBy: 0 },
      { id: id(), code: "cm", name: "Centimetre", category: "Length", active: true, usedBy: 0 },
    ],
    assets: [],
    cycleCounts: [],
    users: [
      {
        id: id(),
        name: `${meta.shortName} Admin`,
        email: `admin@${meta.shortName.toLowerCase().replace(/\s+/g, "")}.example`,
        department: "Operations",
        role: "Administrator",
        status: "Active",
        initials: initials(meta.shortName),
      },
    ],
    notifications: [],
    events: [
      {
        id: id(),
        message: "Project created",
        detail: `${meta.name} is ready. Add locations and assets from Masters.`,
        time: new Date().toISOString(),
        level: "Info",
      },
    ],
    hardware: [],
    labels: [
      {
        id: id(),
        name: "Standard asset label",
        widthMm: 100,
        heightMm: 50,
        description: "Default 100×50 mm label",
        isDefault: true,
        status: "Draft",
        elements: [
          { id: id(), type: "field", x: 5, y: 5, w: 55, h: 8, text: "{{AssetCode}}", fontSize: 11, bold: true, bindField: "AssetCode", symbology: "CODE128" },
          { id: id(), type: "serial", x: 5, y: 15, w: 40, h: 8, text: "000001", fontSize: 10, bold: false, bindField: "Serial", symbology: "CODE128" },
          { id: id(), type: "qr", x: 72, y: 5, w: 22, h: 22, text: "{{AssetCode}}", fontSize: 10, bold: false, bindField: "AssetCode", symbology: "QR" },
          { id: id(), type: "barcode", x: 5, y: 32, w: 90, h: 14, text: "{{BarcodeValue}}", fontSize: 8, bold: false, bindField: "BarcodeValue", symbology: "CODE128" },
        ],
      },
    ],
  };
}

export function demoProject(meta: ProjectMeta): ProjectData {
  const plantA = { id: id(), name: `${meta.shortName} Pune Plant`, kind: "plant" as const, parentId: null, active: true };
  const plantB = { id: id(), name: "Kolhapur", kind: "plant" as const, parentId: null, active: true };
  const whA = { id: id(), name: `${meta.shortName} Pune Warehouse A`, kind: "warehouse" as const, parentId: plantA.id, active: true };
  const whB = { id: id(), name: `${meta.shortName} Pune Warehouse B`, kind: "warehouse" as const, parentId: plantA.id, active: true };
  const zone1 = { id: id(), name: "Dispatch staging", kind: "zone" as const, parentId: whA.id, active: true };
  const zone2 = { id: id(), name: "In-stock aisle 1", kind: "zone" as const, parentId: whA.id, active: true };
  const zone3 = { id: id(), name: "Returns bay", kind: "zone" as const, parentId: whB.id, active: true };
  const zone4 = { id: id(), name: "Repair cage", kind: "zone" as const, parentId: whB.id, active: true };

  const categories: Category[] = [
    cat("EP", "Euro Pallet", "Wooden returnable pallet.", "Wood", 1200, 4200),
    cat("IBC", "IBC Container 1000L", "Intermediate bulk container.", "HDPE", 1200, 18500),
    cat("TR", "Material Trolley", "Shop-floor material trolley.", "Steel", 900, 9800),
    cat("PC", "Plastic Crate", "Stackable crate for parts.", "PP", 600, 850),
    cat("SB", "Steel Bin 600x400", "Heavy-duty steel returnable bin.", "Steel", 600, 3500),
  ];

  const customers: Partner[] = [
    partner("CUST-ANAND", "Anand Auto Components Pvt Ltd", "Automotive", "Pune", "Priya Shah", "customer", 2),
    partner("CUST-BHARAT", "Bharat Foods & Beverages Ltd", "FMCG", "Mumbai", "Rohit Kulkarni", "customer", 2),
    partner("CUST-CRESC", "Crescent Pharma Packaging", "Pharma", "Hyderabad", "Nisha Reddy", "customer", 2),
    partner("CUST-DELTA", "Delta Engineering Works", "Industrial", "Pune", "Amit Desai", "customer", 2),
    partner("CUST-EVEREST", "Everest FMCG Distributors", "FMCG", "Nashik", "Kavita Joshi", "customer", 2),
  ];

  const suppliers: Partner[] = [
    partner("SUP-TROLLEY", "TrolleyTech Services", "Maintenance", "Pune", "Sanjay Patil", "supplier", 2),
    partner("SUP-STEEL", "SteelFix Maintenance Services", "Repair", "Pune", "Meera Iyer", "supplier", 1),
  ];

  const assets = buildAssets(meta, categories, customers, suppliers, whA.name, whB.name);
  const notifications = assets.slice(0, 12).flatMap((a, i) => [
    {
      id: id(),
      assetCode: a.code,
      category: categories.find((c) => c.id === a.categoryId)?.name ?? "",
      type: i % 3 === 0 ? "DwellTimeExceeded" : i % 3 === 1 ? "TransitOverdue" : "LifespanWarning",
      severity: (i % 4 === 0 ? "Critical" : i % 2 === 0 ? "Warning" : "Info") as "Critical" | "Warning" | "Info",
      triggered: daysAgoIso(i + 1),
      status: (i % 5 === 0 ? "Acknowledged" : "Open") as "Acknowledged" | "Open",
    },
  ]);

  return {
    meta,
    locations: [plantA, plantB, whA, whB, zone1, zone2, zone3, zone4],
    departments: [
      { id: id(), name: "Dispatch", plantId: plantA.id },
      { id: id(), name: "Quality", plantId: plantA.id },
      { id: id(), name: "Maintenance", plantId: plantB.id },
    ],
    categories,
    movementTypes: blankProject(meta).movementTypes,
    customers,
    suppliers,
    uoms: blankProject(meta).uoms.map((u, i) => ({ ...u, usedBy: [12, 4, 2, 8, 6][i] ?? 1 })),
    assets,
    cycleCounts: [
      {
        id: id(),
        name: "September warehouse A stocktake",
        warehouseName: whA.name,
        categoryName: "All categories",
        started: daysAgoIso(2),
        completed: null,
        found: 18,
        missing: 1,
        unexpected: 0,
        status: "In Progress",
      },
    ],
    users: [
      { id: id(), name: `${meta.shortName} Admin`, email: "admin@yogsang.example", department: "Leadership", role: "Administrator", status: "Active", initials: initials(meta.shortName) },
      { id: id(), name: "Ops Lead", email: "ops@yogsang.example", department: "Operations", role: "Operations Manager", status: "Active", initials: "OL" },
      { id: id(), name: "Yard Supervisor", email: "yard@yogsang.example", department: "Warehouse", role: "Supervisor", status: "Invited", initials: "YS" },
    ],
    notifications,
    events: [
      { id: id(), message: "Return: 52", detail: "To Kolhapur", time: daysAgoIso(0), level: "Info" },
      { id: id(), message: "Dispatch staged", detail: "8 steel bins ready for Anand Auto", time: daysAgoIso(0), level: "Info" },
      { id: id(), message: "Reader offline", detail: "Warehouse B inbound dock", time: daysAgoIso(1), level: "Warn" },
    ],
    hardware: [
      { id: id(), name: "Dock RFID-01", kind: "RFID Reader", zoneName: zone1.name, status: "Online", lastPing: new Date().toISOString() },
      { id: id(), name: "Handheld-04", kind: "Handheld", zoneName: zone2.name, status: "Online", lastPing: new Date().toISOString() },
      { id: id(), name: "Gateway-WHB", kind: "Gateway", zoneName: zone3.name, status: "Offline", lastPing: daysAgoIso(2) },
    ],
    labels: blankProject(meta).labels,
  };
}

export function defaultMeta(): ProjectMeta {
  return {
    id: id(),
    name: "YOGSANG RETURNABLE INDIA",
    shortName: "Yogsang",
    codePrefix: "YOG",
    accent: "#7d9a70",
    daisyTheme: "templateio",
    primary: "#7d9a70",
    secondary: "#3d5a80",
    industry: "Returnable packaging",
    createdAt: new Date().toISOString(),
    seedDemo: true,
  };
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "P") + (parts[1]?.[0] ?? "A")).toUpperCase();
}

function cat(
  code: string,
  name: string,
  description: string,
  materialClass: string,
  lengthMm: number,
  replacementCost: number,
): Category {
  return {
    id: id(),
    code,
    name,
    description,
    materialClass,
    lengthMm,
    cleaning: "VisualInspection",
    frequencyCycles: 12,
    maxLifespanMonths: 60,
    defaultVendorId: null,
    triggerMaintenance: true,
    maxTransitHrs: 72,
    dwellLimitHrs: 48,
    geoFencing: false,
    enforceBounds: false,
    inspectionCheckpoints: true,
    replacementCost,
    rulesCount: 4,
    active: true,
  };
}

function partner(
  code: string,
  name: string,
  category: string,
  city: string,
  contact: string,
  kind: Partner["kind"],
  assetsOnSite: number,
): Partner {
  return {
    id: id(),
    code,
    name,
    category,
    city,
    state: "Maharashtra",
    country: "India",
    contact,
    active: true,
    assetsOnSite,
    kind,
  };
}

function daysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function buildAssets(
  meta: ProjectMeta,
  categories: Category[],
  customers: Partner[],
  suppliers: Partner[],
  whA: string,
  whB: string,
): Asset[] {
  const plan: Array<{
    status: Asset["status"];
    locationKind: Asset["locationKind"];
    locationLabel: string;
    locationId: string | null;
    aging: number;
    n: number;
  }> = [
    { status: "Active", locationKind: "warehouse", locationLabel: whA, locationId: null, aging: 12, n: 6 },
    { status: "Active", locationKind: "warehouse", locationLabel: whB, locationId: null, aging: 18, n: 4 },
    { status: "Active", locationKind: "transit", locationLabel: "In Transit · to customer", locationId: null, aging: 4, n: 8 },
    { status: "Active", locationKind: "customer", locationLabel: customers[0].name, locationId: customers[0].id, aging: 28, n: 2 },
    { status: "Active", locationKind: "customer", locationLabel: customers[1].name, locationId: customers[1].id, aging: 41, n: 2 },
    { status: "Active", locationKind: "customer", locationLabel: customers[2].name, locationId: customers[2].id, aging: 22, n: 2 },
    { status: "Active", locationKind: "customer", locationLabel: customers[3].name, locationId: customers[3].id, aging: 33, n: 2 },
    { status: "Active", locationKind: "customer", locationLabel: customers[4].name, locationId: customers[4].id, aging: 19, n: 2 },
    { status: "Active", locationKind: "transit", locationLabel: "In Transit · to plant", locationId: null, aging: 3, n: 4 },
    { status: "UnderRepair", locationKind: "repair", locationLabel: `${whB} · Repair cage`, locationId: null, aging: 21, n: 8 },
    { status: "Active", locationKind: "supplier", locationLabel: suppliers[0].name, locationId: suppliers[0].id, aging: 9, n: 3 },
    { status: "Lost", locationKind: "warehouse", locationLabel: whB, locationId: null, aging: 53, n: 2 },
    { status: "Scrapped", locationKind: "warehouse", locationLabel: whA, locationId: null, aging: 67, n: 2 },
  ];

  const assets: Asset[] = [];
  let n = 1;
  for (const row of plan) {
    for (let i = 0; i < row.n; i++) {
      const category = categories[n % categories.length];
      const numericId = 20 + n;
      assets.push({
        id: id(),
        code: `${meta.codePrefix}-2026-${String(numericId).padStart(4, "0")}`,
        numericId,
        categoryId: category.id,
        status: row.status,
        locationLabel: row.locationKind === "customer" ? row.locationLabel : row.locationLabel,
        locationKind: row.locationKind,
        locationId: row.locationId,
        hardware: n % 3 === 0 ? ["qr", "rfid"] : n % 2 === 0 ? ["qr", "barcode"] : ["qr"],
        agingDays: row.aging + i,
        manufacturingDate: n % 7 === 0 ? daysAgoIso(400) : daysAgoIso(120 + n),
        expiryDate: n % 7 === 0 ? daysAgoIso(-40) : null,
        lastSeen: daysAgoIso(n % 10),
        replacementCost: category.replacementCost,
      });
      n += 1;
    }
  }
  return assets;
}
