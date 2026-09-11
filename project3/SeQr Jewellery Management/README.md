# SeQr Jewellery Management System

A comprehensive, multi-tenant jewellery management system built on .NET 10 with EF Core and MSSQL. Supports barcode/RFID tagging, Bartender label printing, invoicing, customer management, repairs, and full audit trails.

---

## Architecture

```
SeQrJewellery.sln
├── SeQrJewellery.Domain          → Entities, Enums (no dependencies)
├── SeQrJewellery.Application     → Interfaces, DTOs, Services
├── SeQrJewellery.Infrastructure  → EF Core, DbContexts, Repositories, Seeds
└── SeQrJewellery.API             → Controllers, Middleware, Program.cs
```

### Multi-Tenancy Model

| Database | Purpose |
|---|---|
| `SeQrJewelleryMain` | Tenant registry, system config, RFID profiles, user auth |
| `SeQrJewellery_{identifier}` | Per-tenant: inventory, invoices, customers, etc. |

Tenant is resolved from the `X-Tenant-Identifier` HTTP header (or subdomain prefix).

---

## Prerequisites

- .NET 10 SDK
- SQL Server (Express or full) – local or AWS RDS
- (Optional) BarTender software for label printing

---

## Getting Started

### 1. Configure the connection string

Edit `src/SeQrJewellery.API/appsettings.json`:

```json
{
  "ConnectionStrings": {
    "MainDatabase": "Server=YOUR_SERVER;Database=SeQrJewelleryMain;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "JWT": {
    "Secret": "CHANGE-THIS-TO-A-LONG-RANDOM-SECRET"
  }
}
```

### 2. Run database migrations

The app auto-migrates on startup. Or run manually:

```powershell
# Main DB
dotnet ef database update --context MainDbContext --project src/SeQrJewellery.Infrastructure --startup-project src/SeQrJewellery.API

# Tenant DB (template)
dotnet ef database update --context TenantDbContext --project src/SeQrJewellery.Infrastructure --startup-project src/SeQrJewellery.API
```

### 3. Run the API

```powershell
dotnet run --project src/SeQrJewellery.API
```

API runs at `https://localhost:7xxx`. Open `https://localhost:7xxx/scalar/v1` for the interactive API docs.

---

## Demo Tenant

Seeded automatically on first run:

| Field | Value |
|---|---|
| Tenant Identifier | `goldpalace` |
| Admin Username | `admin` |
| Admin Email | `admin@goldpalace.in` |
| Admin Password | `Admin@123` |

Use header `X-Tenant-Identifier: goldpalace` for all tenant API calls.

---

## Key API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login → JWT token |
| POST | `/api/auth/refresh` | Refresh access token |

### Jewellery Inventory
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/jewelleryitems` | Paginated list with filters |
| POST | `/api/jewelleryitems` | Create item (auto-calculates price) |
| PUT | `/api/jewelleryitems/{id}` | Update item |
| GET | `/api/jewelleryitems/{id}/stock-movements` | Full stock history |

### Barcode & RFID Tags
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tags/scan/{tagValue}` | Scan any tag → item details |
| POST | `/api/tags/item/{id}/assign` | Assign barcode/RFID to item |
| GET | `/api/tags/item/{id}/generate-barcode` | Auto-generate barcode |

### Print Queue (Bartender Integration)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/printqueue` | Enqueue label print job |
| POST | `/api/printqueue/batch` | Batch enqueue multiple items |
| GET | `/api/printqueue/pending` | Poll pending jobs (unauthenticated) |
| GET | `/api/printqueue/next` | Get next job for a printer |
| PATCH | `/api/printqueue/{id}/status` | Update job status (Bartender callback) |

### Invoices & Payments
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/invoices` | List invoices with filters |
| POST | `/api/invoices` | Create sale/purchase invoice |
| POST | `/api/invoices/{id}/payments` | Add payment |
| POST | `/api/invoices/{id}/cancel` | Cancel invoice (auto-reverses stock) |

### Customers
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/customers` | Search customers |
| POST | `/api/customers` | Create customer |
| GET | `/api/customers/{id}/invoices` | Purchase history |
| GET | `/api/customers/upcoming-occasions` | Birthdays/anniversaries in 30 days |

### Reports & Dashboard
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reports/dashboard` | KPIs, recent sales |
| GET | `/api/reports/sales` | Sales report by date range |
| GET | `/api/reports/inventory` | Stock valuation report |
| GET | `/api/reports/audit` | Audit trail |
| GET | `/api/reports/metal-rates` | Metal rate history |

### Repairs
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/repairs` | List repairs (filter by status) |
| POST | `/api/repairs` | Create repair order |
| PATCH | `/api/repairs/{id}/status` | Update repair status |

### Catalog (Categories, Metals, Suppliers)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/catalog/categories` | All categories (with sub-categories) |
| GET | `/api/catalog/metals` | Metals with purities |
| PUT | `/api/catalog/metals/{id}/rate` | Update metal rate |
| GET | `/api/catalog/suppliers` | Supplier list |

### Tenant Management (SuperAdmin)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/tenants` | All tenants |
| POST | `/api/tenants` | Create tenant + provision DB |
| POST | `/api/tenants/{id}/provision` | Re-run migration + seed |

---

## RFID Configuration

RFID reader profiles are stored in the Main DB (`RFIDReaderProfiles`). Pre-seeded profiles include:

- **Zebra FX9600** – Fixed Ethernet reader (4 antennas)
- **Zebra RFD8500** – Bluetooth handheld sled
- **Impinj Speedway R420** – Industrial fixed reader
- **Impinj xSpan Gateway** – Portal reader
- **Honeywell IF2** – Desktop USB reader
- **Alien ALR-9900+** – High-performance fixed reader
- **Generic USB Barcode Scanner** – Standard HID barcode

Each tenant can have multiple readers via `TenantRFIDReader` with custom IP/port/serial-port overrides.

---

## Bartender Label Printing Integration

The `PrintQueue` table acts as the bridge between this system and BarTender:

1. **Enqueue**: POST to `/api/printqueue` with item ID and template name
2. **Poll**: BarTender service polls `GET /api/printqueue/next?printerName=...`
3. **Print**: BarTender uses the `BartenderData` (JSON) to fill the `.btw` template
4. **Acknowledge**: BarTender calls `PATCH /api/printqueue/{id}/status?status=Completed`

Label data fields available: `SKU`, `Name`, `TagValue`, `Metal`, `Purity`, `GrossWeight`, `NetWeight`, `SellingPrice`, `HallmarkNumber`, `CertificateNumber`, `PrintDate`, `TenantName`.

Pre-configured label templates:
- `JewellerySmall.btw` – 38×25mm barcode
- `JewelleryMedium.btw` – 50×30mm barcode
- `JewelleryRFID.btw` – 50×25mm RFID
- `JewelleryQR.btw` – 40×40mm QR code

---

## Seed Data (Per Tenant)

Each new tenant database is seeded with:

- **Metals**: Gold, Silver, Platinum, Diamond
- **Purities**: 24K/22K/18K/14K/9K gold, 999/925/800 silver, PT950/900/850, diamond grades
- **Categories**: 12 main + 13 sub-categories (Rings, Necklaces, Earrings, Bangles, etc.)
- **Suppliers**: 3 sample suppliers
- **Employees**: 4 sample employees
- **Customers**: 5 sample customers
- **Inventory**: 6 sample jewellery items with barcodes and stock movements
- **Metal Rates**: Current day rates for Gold and Silver
- **Label Templates**: 4 Bartender templates

---

## Invoice Features

- **Types**: Sale, Purchase, Return, Consignment, Repair
- **GST**: Auto-calculates CGST+SGST (intra-state) or IGST (inter-state)
- **Payment Methods**: Cash, Card, Bank Transfer, Cheque, UPI, Gold Exchange, Old Jewellery
- **Old Gold Trade-in**: Deduct value of customer's old gold from invoice total
- **Loyalty Points**: Auto-award points on sale (₹1000 = 1 point)
- **Stock**: Auto-deducts on sale, auto-reverses on cancellation

---

## Security Notes

> ⚠️ Before deploying to production:
> - Replace the JWT secret in `appsettings.json` with a cryptographically random string (min 64 chars)
> - Replace the stub `BCrypt` in `MainDbSeeder.cs` with [BCrypt.Net-Next](https://www.nuget.org/packages/BCrypt.Net-Next/)
> - Enable HTTPS and configure proper CORS origins
> - Use Azure Key Vault or AWS Secrets Manager for connection strings
