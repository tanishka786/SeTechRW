// ── Enums ──────────────────────────────────────────────────────────────
export enum TagType { Barcode = 1, RFID = 2, QRCode = 3 }
export enum PrintStatus { Pending = 1, Printing = 2, Completed = 3, Failed = 4, Cancelled = 5 }
export enum InvoiceType { Sale = 1, Purchase = 2, Return = 3, Consignment = 4, Repair = 5 }
export enum InvoiceStatus { Draft = 1, Confirmed = 2, PartiallyPaid = 3, Paid = 4, Cancelled = 5, Refunded = 6 }
export enum PaymentMethod { Cash = 1, Card = 2, BankTransfer = 3, Cheque = 4, GoldExchange = 5, OldJewellery = 6, UPI = 7, CryptoCurrency = 8, Other = 9 }
export enum StockMovementType { Purchase = 1, Sale = 2, Return = 3, Transfer = 4, Adjustment = 5, RepairIn = 6, RepairOut = 7, ConsignmentIn = 8, ConsignmentOut = 9, Opening = 10 }
export enum RepairStatus { Received = 1, InProgress = 2, ReadyForPickup = 3, Delivered = 4, Cancelled = 5, OnHold = 6 }
export enum TenantStatus { Active = 1, Suspended = 2, Trial = 3, Expired = 4, Cancelled = 5 }
export enum TenantPlan { Free = 1, Basic = 2, Professional = 3, Enterprise = 4 }
export enum CustomerType { Retail = 1, Wholesale = 2, Corporate = 3, VIP = 4 }
export enum GenderType { Male = 1, Female = 2, Other = 3, PreferNotToSay = 4 }
export enum UserRole { SuperAdmin = 1, TenantAdmin = 2, Manager = 3, Staff = 4, ReadOnly = 5 }
export enum MakingChargeType { Lumpsum = 1, PercentOfMetalRate = 2, PerGramAmount = 3 }
export enum LeadSource { WalkIn = 1, Referral = 2, Online = 3, Phone = 4, SocialMedia = 5, Other = 6 }
export enum LeadStatus { New = 1, Contacted = 2, Interested = 3, Negotiating = 4, Won = 5, Lost = 6 }
export enum FollowUpType { Call = 1, Visit = 2, WhatsApp = 3, Email = 4, Other = 5 }
export enum LeadActivityType { Created = 1, StatusChanged = 2, Assigned = 3, NoteAdded = 4, FollowUpScheduled = 5, FollowUpCompleted = 6, Converted = 7, Updated = 8, Deleted = 9 }
export enum AppModule { Dashboard = 1, Inventory = 2, Invoices = 3, Customers = 4, Crm = 5, Repairs = 6, Reports = 7, RateHistory = 8, PrintQueue = 9, Social = 10, Settings = 11, Users = 12, Scan = 13, AuditReports = 14 }
export enum PermissionAction { None = 0, View = 1, Create = 2, Edit = 4, Delete = 8, Manage = 16, All = 31 }
export enum SocialPlatform { Google = 1, Instagram = 2, Facebook = 3 }
export enum SocialPostStatus { Draft = 1, Queued = 2, Published = 3, Failed = 4 }
export enum InvoicePaperSize { A4 = 1, A5 = 2, Letter = 3 }

// ── Auth ──────────────────────────────────────────────────────────────
export interface LoginRequest { username: string; password: string; tenantIdentifier?: string }
export interface UserProfile { id: string; username: string; email: string; firstName: string; lastName: string; role: UserRole; profilePicture?: string }
export interface TenantInfo { id: string; identifier: string; businessName: string; logo?: string; currency: string; currencySymbol: string }
export interface UserPermissions {
  isSuperAdmin: boolean; isTenantAdmin: boolean; canViewAllLeads?: boolean;
  modules: Record<string, number>
}
export interface LoginResponse { accessToken: string; refreshToken: string; expiresAt: string; user: UserProfile; tenant: TenantInfo; permissions: UserPermissions }

// ── Common ────────────────────────────────────────────────────────────
export interface ApiResponse<T> { success: boolean; data: T; message?: string; errors?: string[] }
export interface PagedResult<T> { items: T[]; totalCount: number; pageNumber: number; pageSize: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean }

// ── Jewellery ─────────────────────────────────────────────────────────
export interface JewelleryItem {
  id: string; sku: string; name: string; description?: string;
  categoryId: string; categoryName: string; metalId: string; metalName: string;
  purityId: string; purityName: string; supplierId?: string; supplierName?: string;
  grossWeight: number; netWeight: number; stoneWeight: number; wastagePercent: number;
  metalRate: number; metalValue: number; makingCharges: number; makingChargesPercent: number;
  makingChargeType: MakingChargeType; makingChargeValue: number;
  stoneCharges: number; otherCharges: number; discount: number; taxPercent: number; taxAmount: number;
  sellingPrice: number; costPrice: number; quantityInStock: number;
  location?: string; design?: string; style?: string; size?: string;
  color?: string; occasion?: string; gender?: string; collection?: string; notes?: string;
  hallmarkNumber?: string; certificateNumber?: string; isBISCertified: boolean; isConsignment?: boolean;
  imageUrls?: string; primaryImageUrl?: string; media?: ItemMedia[]; isActive: boolean; isSold?: boolean; createdAt: string;
}

export interface SkuSuggestion {
  id: string; sku: string; name: string; metalName: string; purityName: string;
  quantityInStock: number; sellingPrice: number;
}

export interface ItemMedia {
  id: string; url: string; fileName: string; contentType: string;
  mediaType: 'Image' | 'Video'; fileSizeBytes: number; sortOrder: number; isPrimary: boolean;
}

export interface CreateJewelleryItemRequest {
  sku?: string; name: string; description?: string;
  categoryId: string; metalId: string; purityId: string; supplierId?: string;
  grossWeight: number; netWeight: number; stoneWeight: number; wastagePercent: number;
  metalRate: number; makingCharges: number; makingChargesPercent: number;
  makingChargeType: MakingChargeType; makingChargeValue: number;
  stoneCharges: number; otherCharges: number; discount: number; taxPercent: number;
  costPrice: number; initialStock: number; location?: string;
  design?: string; style?: string; size?: string; color?: string; occasion?: string;
  gender?: string; collection?: string; certificateNumber?: string; hallmarkNumber?: string;
  isBISCertified: boolean; isConsignment: boolean; notes?: string; purchaseDate?: string;
  /** Preprinted tag barcode / QR / EPC to map on create */
  mapTagValue?: string;
  /** When SKU exists, add stock instead of rejecting */
  addToExistingSku?: boolean;
}

export interface BulkCreateJewelleryItemsRequest extends CreateJewelleryItemRequest {
  tagValues?: string[];
  referenceFrom?: number;
  referenceTo?: number;
}

export interface BulkCreateJewelleryItemsResult {
  createdCount: number; baseSku: string; firstSku?: string; lastSku?: string;
}

export interface ImageSearchResult {
  item: JewelleryItem;
  /** Cosine similarity 0..1 */
  score: number;
  matchedMediaUrl?: string;
}

export interface StockRangeLookup {
  from: number; to: number; requested: number; found: number; available: number;
  isAvailable: boolean; missingReferenceNumbers: number[]; unavailableReferenceNumbers: number[]; message: string;
}

export interface JewelleryItemFilter {
  searchTerm?: string; categoryId?: string; metalId?: string; purityId?: string;
  supplierId?: string; minPrice?: number; maxPrice?: number;
  minWeight?: number; maxWeight?: number; location?: string; design?: string; style?: string;
  hallmarkedOnly?: boolean; createdFrom?: string; createdTo?: string;
  inStock?: boolean; isActive?: boolean; pageNumber: number; pageSize: number;
  sortBy?: string; sortDescending?: boolean;
}

// ── Tags ──────────────────────────────────────────────────────────────
export interface JewelleryTag { id: string; jewelleryItemId?: string | null; referenceNumber?: number | null; barcodeValue: string; qrCodeValue?: string; epc?: string; epcHex?: string; tid?: string; isPrimary: boolean; isActive: boolean; isMapped?: boolean; lastScannedAt?: string; printCount: number; createdAt: string }
export interface TagScanResult {
  jewelleryItemId?: string | null; sku: string; name: string; category: string; metal: string; purity: string;
  grossWeight: number; netWeight: number; sellingPrice: number; quantityInStock: number;
  matchedValue: string; matchedBy: string; barcodeValue: string; qrCodeValue?: string; epc?: string; epcHex?: string;
  hallmarkNumber?: string; certificateNumber?: string
}
export interface StockTagLookup {
  id?: string; barcodeValue?: string; qrCodeValue?: string; epc?: string; epcHex?: string;
  matchedValue: string; matchedBy?: string; isAvailable: boolean; jewelleryItemId?: string | null; message: string
}
export interface AssignTagRequest { barcodeValue?: string; qrCodeValue?: string; epc?: string; epcHex?: string; tid?: string; isPrimary: boolean }
export interface MapTagRequest { scanValue: string; isPrimary: boolean }

// ── Customers ─────────────────────────────────────────────────────────
export interface Customer {
  id: string; customerCode: string; firstName: string; lastName: string; fullName: string;
  email?: string; phone?: string; alternatePhone?: string; dateOfBirth?: string; anniversary?: string;
  gender: GenderType; customerType: CustomerType; pan?: string; gst?: string;
  creditLimit: number; loyaltyPoints: number; address?: string; city?: string; state?: string; country?: string;
  totalPurchaseAmount: number; totalPurchaseCount: number; lastPurchaseDate?: string; isActive: boolean; createdAt: string;
}

export interface CreateCustomerRequest {
  firstName: string; lastName?: string; email?: string; phone?: string; alternatePhone?: string;
  dateOfBirth?: string; anniversary?: string; gender: GenderType; customerType: CustomerType;
  pan?: string; aadhaarNumber?: string; gst?: string; creditLimit: number;
  address?: string; city?: string; state?: string; country?: string; postalCode?: string; notes?: string; referredBy?: string;
}

// ── Invoices ──────────────────────────────────────────────────────────
export interface Invoice {
  id: string; invoiceNumber: string; invoiceType: InvoiceType; status: InvoiceStatus;
  invoiceDate: string; dueDate?: string; customerId?: string; customerName?: string; customerPhone?: string;
  supplierId?: string; supplierName?: string; subTotal: number; totalDiscount: number;
  totalTax: number; totalAmount: number; paidAmount: number; balanceAmount: number;
  oldGoldAmount: number; cgst: number; sgst: number; igst: number; notes?: string;
  items: InvoiceItem[]; payments: Payment[]; createdAt: string;
}

export interface InvoiceItem {
  id: string; jewelleryItemId: string; sku: string; itemName: string; tagValue?: string;
  quantity: number; grossWeight: number; netWeight: number; metalRate: number; metalValue: number;
  makingCharges: number; stoneCharges: number; discount: number; taxPercent: number; taxAmount: number; unitPrice: number; totalPrice: number;
}

export interface Payment {
  id: string; paymentMethod: PaymentMethod; amount: number; paymentDate: string;
  transactionReference?: string; chequeNumber?: string; bankName?: string;
  cardLast4?: string; upiTransactionId?: string; notes?: string; isRefunded: boolean
}

export interface CreateInvoiceRequest {
  invoiceType: InvoiceType; invoiceDate: string; dueDate?: string; customerId?: string; supplierId?: string;
  oldGoldAmount: number; oldGoldWeight: number; isIGST: boolean; notes?: string; terms?: string;
  items: CreateInvoiceItemRequest[]; payments?: CreatePaymentRequest[];
}

export interface CreateInvoiceItemRequest { jewelleryItemId: string; tagValue?: string; quantity: number; overridePrice?: number; discount?: number }
export interface CreatePaymentRequest {
  paymentMethod: PaymentMethod; amount: number; paymentDate?: string; transactionReference?: string;
  chequeNumber?: string; bankName?: string; cardLast4?: string; upiTransactionId?: string;
  oldGoldWeight?: number; oldGoldPurity?: number; oldGoldRate?: number; notes?: string;
  statusOverride?: InvoiceStatus;
}
export interface UpdateInvoiceStatusRequest { status: InvoiceStatus; notes?: string }

// ── Print Queue ───────────────────────────────────────────────────────
export interface PrintJob {
  id: string; jewelleryItemId?: string; itemSKU?: string; itemName?: string;
  tagValue?: string; tagType: TagType; status: PrintStatus; labelTemplate: string;
  copies: number; printedCopies: number; printerName?: string; bartenderFormat?: string;
  printStartedAt?: string; printCompletedAt?: string; errorMessage?: string;
  retryCount: number; priority: number; requestedBy: string; createdAt: string;
}

export interface CreatePrintJobRequest { jewelleryItemId: string; tagType: TagType; labelTemplate: string; copies: number; printerName?: string; bartenderFormat?: string; priority: number }

// ── Repairs ──────────────────────────────────────────────────────────
export interface Repair {
  id: string; repairOrderNumber: string; customerId: string; status: RepairStatus;
  receivedDate: string; estimatedCompletionDate?: string; actualCompletionDate?: string; deliveryDate?: string;
  itemDescription: string; itemWeight?: number; metalType?: string; purity?: string; condition?: string;
  customerInstructions?: string; internalNotes?: string; estimatedCost: number; actualCost: number;
  advanceAmount: number; balanceAmount: number; isPaid: boolean;
  assignedToEmployeeId?: string; receivedByEmployeeId: string;
  customer?: Customer; repairItems: RepairItem[];
}

export interface RepairItem { id: string; repairId: string; description: string; estimatedCost: number; actualCost: number; isCompleted: boolean; notes?: string }

export interface CreateRepairRequest {
  customerId: string; itemDescription: string; itemWeight?: number; metalType?: string; purity?: string;
  condition?: string; customerInstructions?: string; estimatedCost: number; advanceAmount: number;
  estimatedCompletionDate?: string; receivedByEmployeeId?: string; assignedToEmployeeId?: string;
  repairItems?: { description: string; estimatedCost: number }[];
}

// ── Catalog ───────────────────────────────────────────────────────────
export interface Category { id: string; name: string; description?: string; parentCategoryId?: string; subCategories: Category[]; displayOrder: number }
export interface Metal { id: string; name: string; metalType: number; symbol: string; currentMarketRate: number; rateUnit: string; purities: Purity[] }
export interface Purity { id: string; metalId: string; name: string; purityPercentage: number; hallmarkCode?: string }
export interface Supplier { id: string; name: string; contactPerson?: string; email?: string; phone?: string; city?: string; gstNumber?: string }
export interface LabelTemplate { id: string; name: string; tagType: TagType; bartenderTemplateName: string; isDefault: boolean; labelWidthMm: number; labelHeightMm: number }

// ── Reports ───────────────────────────────────────────────────────────
export interface DashboardData {
  todaySales: number; monthSales: number; totalItems: number; inStockItems: number;
  totalCustomers: number; pendingRepairs: number; pendingPrintJobs: number;
  recentInvoices: { invoiceNumber: string; customerName: string; totalAmount: number; status: InvoiceStatus; invoiceDate: string }[];
}

export interface SalesReport {
  fromDate: string; toDate: string; totalInvoices: number; totalSalesAmount: number;
  totalTaxCollected: number; totalDiscount: number; totalWeight: number;
  salesByDay: { date: string; invoiceCount: number; amount: number }[];
  salesByCategory: { categoryName: string; itemCount: number; totalAmount: number; percentage: number }[];
  salesByMetal: { metalName: string; totalWeight: number; totalAmount: number }[];
  topCustomers: { customerName: string; purchaseCount: number; totalAmount: number }[];
}

export interface InventoryReport {
  totalItems: number; totalInStockItems: number; totalOutOfStockItems: number;
  totalStockValue: number; totalGoldWeight: number; totalSilverWeight: number;
  byCategory: { categoryName: string; itemCount: number; stockValue: number; totalWeight: number }[];
  byMetal: { metalName: string; purityName: string; itemCount: number; totalWeight: number; stockValue: number }[];
  lowStockItems: { id: string; sku: string; name: string; quantityInStock: number; reorderLevel: number }[];
}

// ── MetalRate ────────────────────────────────────────────────────────
export interface MetalRate { id: string; metalId: string; purityId: string; ratePerGram: number; ratePerTola: number; ratePerOz: number; rateDate: string; source?: string; metal?: Metal; purity?: Purity }

export interface RateHistoryItem {
  id: string; metalId: string; metalName: string; purityId: string; purityName: string;
  ratePerGram: number; ratePerTola: number; previousRate?: number; changeAmount?: number; changePercent?: number;
  source?: string; notes?: string; updatedByUserId?: string; updatedByUserName?: string; itemsRepriced: number; rateDate: string;
}

// ── Inventory audits (floor / RFID — written by Scan Service) ─────────
export enum InventoryAuditStatus { InProgress = 1, Completed = 2, Cancelled = 3 }
export enum InventoryAuditScanOutcome { Matched = 1, Extra = 2, Unmapped = 3, Sold = 4 }

export interface InventoryAuditListItem {
  id: string
  startedAt: string
  completedAt?: string
  status: InventoryAuditStatus
  startedBy: string
  notes?: string
  expectedCount: number
  scannedCount: number
  matchedCount: number
  missingCount: number
  extraCount: number
  soldSkippedCount: number
}

export interface InventoryAuditScan {
  id: string
  epcHex: string
  outcome: InventoryAuditScanOutcome
  tagId?: string
  itemId?: string
  sku?: string
  name?: string
  scannedAt: string
}

export interface InventoryAuditMissing {
  id: string
  tagId: string
  itemId?: string
  barcodeValue?: string
  epcHex?: string
  reason: string
  sku?: string
  name?: string
}

export interface InventoryAuditReport extends InventoryAuditListItem {
  scans: InventoryAuditScan[]
  missing: InventoryAuditMissing[]
}

// ── CRM ──────────────────────────────────────────────────────────────────
export interface Lead {
  id: string; leadCode: string; firstName: string; lastName: string; fullName: string;
  phone?: string; email?: string; source: LeadSource; status: LeadStatus;
  interestedIn?: string; occasion?: string; budget?: number; notes?: string;
  assignedToUserId?: string; assignedToUserName?: string; assignedToEmployeeId?: string;
  nextFollowUpDate?: string; convertedCustomerId?: string; convertedAt?: string;
  followUpCount: number; openFollowUpCount: number; noteCount: number; createdAt: string;
}
export interface LeadDetail extends Lead {
  followUps: LeadFollowUp[]; leadNotes: LeadNote[]; activities: LeadActivity[];
}
export interface LeadFollowUp {
  id: string; leadId: string; type: FollowUpType; scheduledAt: string; completedAt?: string;
  notes?: string; outcome?: string; isCompleted: boolean; leadName?: string; leadPhone?: string;
  leadCode?: string; leadStatus?: LeadStatus; assignedToUserId?: string; assignedToUserName?: string;
  createdByUserId?: string; createdByUserName?: string; isOverdue?: boolean; isDueToday?: boolean;
}
export interface LeadNote {
  id: string; leadId: string; content: string; createdByUserId?: string;
  createdByUserName: string; isPinned: boolean; createdAt: string;
}
export interface LeadActivity {
  id: string; leadId: string; activityType: LeadActivityType; summary: string; details?: string;
  performedByUserId?: string; performedByUserName: string; occurredAt: string;
}
export interface CreateLeadRequest {
  firstName: string; lastName?: string; phone?: string; email?: string; source: LeadSource;
  interestedIn?: string; occasion?: string; budget?: number; notes?: string;
  assignedToUserId?: string; nextFollowUpDate?: string;
}
export interface UpdateLeadRequest {
  firstName?: string; lastName?: string; phone?: string; email?: string; source?: LeadSource;
  status?: LeadStatus; interestedIn?: string; occasion?: string; budget?: number; notes?: string;
  assignedToUserId?: string; clearAssignee?: boolean; nextFollowUpDate?: string;
}
export interface CreateLeadFollowUpRequest { type: FollowUpType; scheduledAt: string; notes?: string }
export interface CreateLeadNoteRequest { content: string; isPinned?: boolean }
export interface CrmPipelineSummary { status: LeadStatus; count: number; totalBudget: number }
export interface FollowUpStats { dueToday: number; overdue: number; upcoming: number; completedToday: number }

// ── RBAC (Phase 8) ──────────────────────────────────────────────────────
export interface RolePermission { module: AppModule; actions: PermissionAction }
export interface Role { id: string; name: string; description?: string; isSystemRole: boolean; userCount: number; permissions: RolePermission[] }
export interface CreateRoleRequest { name: string; description?: string; permissions: RolePermission[] }
export interface UpdateRoleRequest { name?: string; description?: string; permissions?: RolePermission[] }
export interface TenantUserAccount {
  id: string; username: string; email: string; firstName: string; lastName: string; phone?: string;
  role: UserRole; isActive: boolean; lastLoginAt?: string; roleNames: string[]; roleIds: string[]; createdAt: string;
}
export interface CreateTenantUserRequest {
  username: string; email: string; password: string; firstName: string; lastName: string;
  phone?: string; role: UserRole; roleIds?: string[];
}
export interface UpdateTenantUserRequest {
  email?: string; firstName?: string; lastName?: string; phone?: string; role?: UserRole; isActive?: boolean; roleIds?: string[];
}

// ── Invoice settings (Phase 4) ──────────────────────────────────────────
export interface InvoiceSettings {
  id: string; shopName: string; addressLine1?: string; addressLine2?: string; city?: string; state?: string;
  stateCode?: string; postalCode?: string; phone?: string; email?: string; gstin?: string; pan?: string; logoPath?: string;
  bankName?: string; bankAccountName?: string; bankAccountNumber?: string; bankIFSC?: string; bankBranch?: string;
  upiId?: string; upiQrCodePath?: string; termsAndConditions?: string; declaration?: string;
  signatoryName?: string; signatoryDesignation?: string; jurisdiction?: string; defaultHSNCode?: string;
  tagline?: string; footerNote?: string;
  showIGST: boolean; showHallmark: boolean; showOldGoldSection: boolean;
  showLogo: boolean; showBankDetails: boolean; showPaymentHistory: boolean; showTagline: boolean;
  primaryColorHex: string; accentColorHex: string; paperSize: InvoicePaperSize;
  marginMm: number; logoHeightMm: number; fontSizePt: number;
  razorpayEnabled: boolean; razorpayKeyId?: string; razorpayKeySecretConfigured: boolean;
}
export type UpdateInvoiceSettingsRequest = Omit<InvoiceSettings, 'id' | 'logoPath' | 'upiQrCodePath' | 'razorpayKeySecretConfigured'> & { razorpayKeySecret?: string }

// ── Payments / Razorpay (Phase 5) ───────────────────────────────────────
export interface RazorpayOrder {
  orderId: string; currency: string; amountInPaise: number; keyId: string;
  invoiceId: string; invoiceNumber: string; customerName?: string; customerPhone?: string; customerEmail?: string;
}
export interface PaymentLink { paymentLinkId: string; shortUrl: string }

// ── Social (Phase 9) ─────────────────────────────────────────────────────
export interface SocialSettings { googleConnected: boolean; googleAccountName?: string; instagramConnected: boolean; instagramAccountName?: string }
export interface SocialReview { reviewId: string; reviewerName: string; starRating?: number; comment: string; replyComment?: string; createTime: string }
export interface SocialPost {
  id: string; platform: SocialPlatform; jewelleryItemId?: string; caption: string; imageUrl?: string;
  status: SocialPostStatus; externalPostId?: string; errorMessage?: string; publishedAt?: string; createdAt: string;
}
