import { apiClient } from './client'
import { downloadFile } from '../utils/download'
import type {
  LoginRequest, LoginResponse, JewelleryItem, CreateJewelleryItemRequest, JewelleryItemFilter,
  BulkCreateJewelleryItemsRequest, BulkCreateJewelleryItemsResult, StockRangeLookup, ImageSearchResult,
  SkuSuggestion,
  JewelleryTag, TagScanResult, AssignTagRequest, StockTagLookup, MapTagRequest, Customer, CreateCustomerRequest,
  Invoice, CreateInvoiceRequest, CreatePaymentRequest, PrintJob, CreatePrintJobRequest,
  Repair, CreateRepairRequest, Category, Metal, Supplier, LabelTemplate, LiveMetalRate,
  DashboardData, SalesReport, InventoryReport, MetalRate, RateHistoryItem, PagedResult, ApiResponse,
  InventoryAuditListItem, InventoryAuditReport, InventoryAuditStatus, ItemMedia,
  Lead, LeadDetail, CreateLeadRequest, UpdateLeadRequest, LeadFollowUp, CreateLeadFollowUpRequest, CrmPipelineSummary,
  LeadNote, LeadActivity, CreateLeadNoteRequest, FollowUpStats, FollowUpType,
  LeadStatus, LeadSource,
  Role, CreateRoleRequest, UpdateRoleRequest, TenantUserAccount, CreateTenantUserRequest, UpdateTenantUserRequest,
  InvoiceSettings, UpdateInvoiceSettingsRequest, CashKycStatus,
  RazorpayOrder, PaymentLink,
  SocialSettings, SocialReview, SocialPost,
} from '../types'
import { PrintStatus, RepairStatus, InvoiceStatus, InvoiceType } from '../types'

const unwrap = <T>(r: { data: ApiResponse<T> }) => r.data.data

// ── Auth ──────────────────────────────────────────────────────────────
export const authApi = {
  login: (req: LoginRequest) =>
    apiClient.post<ApiResponse<LoginResponse>>('/auth/login', req).then(unwrap),
  refresh: (refreshToken: string, tenantIdentifier: string) =>
    apiClient.post<ApiResponse<LoginResponse>>('/auth/refresh', { refreshToken, tenantIdentifier }).then(unwrap),
}

// ── Dashboard ─────────────────────────────────────────────────────────
export const reportsApi = {
  dashboard: () => apiClient.get<ApiResponse<DashboardData>>('/reports/dashboard').then(unwrap),
  sales: (params: { fromDate?: string; toDate?: string }) =>
    apiClient.get<ApiResponse<SalesReport>>('/reports/sales', { params }).then(unwrap),
  inventory: () => apiClient.get<ApiResponse<InventoryReport>>('/reports/inventory').then(unwrap),
  audit: (params?: object) => apiClient.get<ApiResponse<unknown>>('/reports/audit', { params }).then(unwrap),
  metalRates: (metalId?: string, days?: number) =>
    apiClient.get<ApiResponse<MetalRate[]>>('/reports/metal-rates', { params: { metalId, days } }).then(unwrap),
  exportSales: (params: { fromDate?: string; toDate?: string }) => downloadFile('/reports/sales/export', params, 'SalesReport.xlsx'),
  exportInventory: () => downloadFile('/reports/inventory/export', undefined, 'InventoryReport.xlsx'),
  exportMetalRates: (metalId?: string, days?: number) => downloadFile('/reports/metal-rates/export', { metalId, days }, 'MetalRateHistory.xlsx'),
  exportAudit: (params?: Record<string, unknown>) => downloadFile('/reports/audit/export', params, 'AuditLog.xlsx'),
}

// ── Inventory ─────────────────────────────────────────────────────────
export const inventoryApi = {
  list: (filter: JewelleryItemFilter) =>
    apiClient.get<ApiResponse<PagedResult<JewelleryItem>>>('/jewelleryitems', { params: filter }).then(unwrap),
  getById: (id: string) =>
    apiClient.get<ApiResponse<JewelleryItem>>(`/jewelleryitems/${id}`).then(unwrap),
  getBySku: (sku: string) =>
    apiClient.get<ApiResponse<JewelleryItem>>(`/jewelleryitems/sku/${sku}`).then(unwrap),
  skuSuggestions: (q: string, limit = 10) =>
    apiClient.get<ApiResponse<SkuSuggestion[]>>('/jewelleryitems/sku-suggestions', { params: { q, limit } }).then(unwrap),
  create: (req: CreateJewelleryItemRequest) =>
    apiClient.post<ApiResponse<JewelleryItem>>('/jewelleryitems', req).then(unwrap),
  bulkCreate: (req: BulkCreateJewelleryItemsRequest) =>
    apiClient.post<ApiResponse<BulkCreateJewelleryItemsResult>>('/jewelleryitems/bulk', req).then(unwrap),
  searchByImage: (image: File, top = 10) => {
    const form = new FormData()
    form.append('image', image)
    return apiClient.post<ApiResponse<ImageSearchResult[]>>(`/jewelleryitems/search-by-image?top=${top}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap)
  },
  update: (id: string, req: Partial<CreateJewelleryItemRequest>) =>
    apiClient.put<ApiResponse<JewelleryItem>>(`/jewelleryitems/${id}`, req).then(unwrap),
  delete: (id: string) =>
    apiClient.delete<ApiResponse<boolean>>(`/jewelleryitems/${id}`).then(unwrap),
  stockMovements: (id: string) =>
    apiClient.get<ApiResponse<unknown[]>>(`/jewelleryitems/${id}/stock-movements`).then(unwrap),
}

// ── Item media ────────────────────────────────────────────────────────
export const mediaApi = {
  listForItem: (itemId: string) =>
    apiClient.get<ApiResponse<ItemMedia[]>>(`/jewelleryitems/${itemId}/media`).then(unwrap),
  upload: (itemId: string, files: File[]) => {
    const form = new FormData()
    files.forEach(f => form.append('files', f))
    return apiClient.post<ApiResponse<ItemMedia[]>>(`/jewelleryitems/${itemId}/media`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap)
  },
  delete: (itemId: string, mediaId: string) =>
    apiClient.delete<ApiResponse<boolean>>(`/jewelleryitems/${itemId}/media/${mediaId}`).then(unwrap),
  setPrimary: (itemId: string, mediaId: string) =>
    apiClient.put<ApiResponse<ItemMedia>>(`/jewelleryitems/${itemId}/media/${mediaId}/primary`).then(unwrap),
}

export const certificatesApi = {
  list: (itemId: string) =>
    apiClient.get<ApiResponse<ItemMedia[]>>(`/jewelleryitems/${itemId}/certificates`).then(unwrap),
  upload: (itemId: string, files: File[], certificateKind: string) => {
    const form = new FormData()
    files.forEach(f => form.append('files', f))
    form.append('certificateKind', certificateKind)
    return apiClient.post<ApiResponse<ItemMedia[]>>(`/jewelleryitems/${itemId}/certificates`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap)
  },
  delete: (itemId: string, mediaId: string) =>
    apiClient.delete<ApiResponse<boolean>>(`/jewelleryitems/${itemId}/certificates/${mediaId}`).then(unwrap),
}

// ── Tags ──────────────────────────────────────────────────────────────
export const tagsApi = {
  scan: (scanValue: string) =>
    apiClient.get<ApiResponse<TagScanResult>>(`/tags/scan/${encodeURIComponent(scanValue)}`).then(unwrap),
  lookupStock: (scanValue: string) =>
    apiClient.get<ApiResponse<StockTagLookup>>(`/tags/stock/${encodeURIComponent(scanValue)}`).then(unwrap),
  lookupStockRange: (from: number, to: number) =>
    apiClient.get<ApiResponse<StockRangeLookup>>('/tags/stock-range', { params: { from, to } }).then(unwrap),
  getForItem: (itemId: string) =>
    apiClient.get<ApiResponse<JewelleryTag[]>>(`/tags/item/${itemId}`).then(unwrap),
  assign: (itemId: string, req: AssignTagRequest) =>
    apiClient.post<ApiResponse<JewelleryTag>>(`/tags/item/${itemId}/assign`, req).then(unwrap),
  map: (itemId: string, req: MapTagRequest) =>
    apiClient.post<ApiResponse<JewelleryTag>>(`/tags/item/${itemId}/map`, req).then(unwrap),
  generateBarcode: (itemId: string) =>
    apiClient.get<ApiResponse<{ barcode: string }>>(`/tags/item/${itemId}/generate-barcode`).then(unwrap),
  deactivate: (tagId: string) =>
    apiClient.delete<ApiResponse<boolean>>(`/tags/${tagId}`).then(unwrap),
  validate: (scanValue: string) =>
    apiClient.get<ApiResponse<{ scanValue: string; isValid: boolean }>>(`/tags/validate/${encodeURIComponent(scanValue)}`).then(unwrap),
}

// ── Customers ─────────────────────────────────────────────────────────
export const customersApi = {
  list: (search?: string, page = 1, pageSize = 20) =>
    apiClient.get<ApiResponse<PagedResult<Customer>>>('/customers', { params: { search, page, pageSize } }).then(unwrap),
  getById: (id: string) =>
    apiClient.get<ApiResponse<Customer>>(`/customers/${id}`).then(unwrap),
  create: (req: CreateCustomerRequest) =>
    apiClient.post<ApiResponse<Customer>>('/customers', req).then(unwrap),
  update: (id: string, req: Partial<CreateCustomerRequest>) =>
    apiClient.put<ApiResponse<Customer>>(`/customers/${id}`, req).then(unwrap),
  invoices: (id: string) =>
    apiClient.get<ApiResponse<Invoice[]>>(`/customers/${id}/invoices`).then(unwrap),
  upcomingOccasions: () =>
    apiClient.get<ApiResponse<unknown[]>>('/customers/upcoming-occasions').then(unwrap),
  export: (search?: string) => downloadFile('/customers/export', { search }, 'Customers.xlsx'),
}

// ── Invoices ──────────────────────────────────────────────────────────
export const invoicesApi = {
  list: (params: { searchTerm?: string; invoiceType?: InvoiceType; status?: InvoiceStatus; customerId?: string; fromDate?: string; toDate?: string; pageNumber?: number; pageSize?: number }) =>
    apiClient.get<ApiResponse<PagedResult<Invoice>>>('/invoices', { params }).then(unwrap),
  getById: (id: string) =>
    apiClient.get<ApiResponse<Invoice>>(`/invoices/${id}`).then(unwrap),
  create: (req: CreateInvoiceRequest) =>
    apiClient.post<ApiResponse<Invoice>>('/invoices', req).then(unwrap),
  addPayment: (id: string, req: CreatePaymentRequest) =>
    apiClient.post<ApiResponse<Invoice>>(`/invoices/${id}/payments`, req).then(unwrap),
  updateInvoiceStatus: (id: string, req: { status: InvoiceStatus; notes?: string }) =>
    apiClient.patch<ApiResponse<Invoice>>(`/invoices/${id}/status`, req).then(unwrap),
  cancel: (id: string) =>
    apiClient.post<ApiResponse<Invoice>>(`/invoices/${id}/cancel`).then(unwrap),
  export: (params: { searchTerm?: string; invoiceType?: InvoiceType; status?: InvoiceStatus; fromDate?: string; toDate?: string }) =>
    downloadFile('/invoices/export', params, 'Invoices.xlsx'),
  downloadPdf: (id: string, invoiceNumber: string) => downloadFile(`/invoices/${id}/pdf`, undefined, `Invoice_${invoiceNumber}.pdf`),
  cashKyc: (customerId?: string) =>
    apiClient.get<ApiResponse<CashKycStatus>>('/invoices/cash-kyc', { params: { customerId } }).then(unwrap),
}

// ── Print Queue ───────────────────────────────────────────────────────
export const printQueueApi = {
  list: (status?: PrintStatus) =>
    apiClient.get<ApiResponse<PrintJob[]>>('/printqueue', { params: { status } }).then(unwrap),
  pending: () =>
    apiClient.get<ApiResponse<PrintJob[]>>('/printqueue/pending').then(unwrap),
  enqueue: (req: CreatePrintJobRequest) =>
    apiClient.post<ApiResponse<PrintJob>>('/printqueue', req).then(unwrap),
  batchEnqueue: (itemIds: string[], options: Partial<CreatePrintJobRequest>) =>
    apiClient.post<ApiResponse<PrintJob[]>>('/printqueue/batch', { jewelleryItemIds: itemIds, ...options }).then(unwrap),
  updateStatus: (id: string, status: PrintStatus, errorMessage?: string) =>
    apiClient.patch<ApiResponse<boolean>>(`/printqueue/${id}/status`, null, { params: { status, errorMessage } }).then(unwrap),
  cancel: (id: string) =>
    apiClient.post<ApiResponse<boolean>>(`/printqueue/${id}/cancel`).then(unwrap),
  requeue: (id: string) =>
    apiClient.post<ApiResponse<boolean>>(`/printqueue/${id}/requeue`).then(unwrap),
  clearCompleted: (olderThan: string) =>
    apiClient.delete<ApiResponse<{ clearedCount: number }>>('/printqueue/clear-completed', { params: { olderThan } }).then(unwrap),
}

// ── Repairs ──────────────────────────────────────────────────────────
export const repairsApi = {
  list: (status?: RepairStatus, search?: string) =>
    apiClient.get<ApiResponse<Repair[]>>('/repairs', { params: { status, search } }).then(unwrap),
  getById: (id: string) =>
    apiClient.get<ApiResponse<Repair>>(`/repairs/${id}`).then(unwrap),
  create: (req: CreateRepairRequest) =>
    apiClient.post<ApiResponse<Repair>>('/repairs', req).then(unwrap),
  updateStatus: (id: string, status: RepairStatus) =>
    apiClient.patch<ApiResponse<Repair>>(`/repairs/${id}/status`, null, { params: { status } }).then(unwrap),
}

// ── Catalog ───────────────────────────────────────────────────────────
export const catalogApi = {
  categories: () => apiClient.get<ApiResponse<Category[]>>('/catalog/categories').then(unwrap),
  createCategory: (req: { name: string; description?: string; parentCategoryId?: string; displayOrder?: number }) =>
    apiClient.post<ApiResponse<Category>>('/catalog/categories', req).then(unwrap),
  metals: () => apiClient.get<ApiResponse<Metal[]>>('/catalog/metals').then(unwrap),
  liveRates: () => apiClient.get<ApiResponse<LiveMetalRate[]>>('/catalog/metals/live-rates').then(unwrap),
  updateMetalRate: (id: string, req: { purityId: string; ratePerGram: number; source?: string }) =>
    apiClient.put<ApiResponse<Metal>>(`/catalog/metals/${id}/rate`, req).then(unwrap),
  suppliers: () => apiClient.get<ApiResponse<Supplier[]>>('/catalog/suppliers').then(unwrap),
  createSupplier: (req: Partial<Supplier>) =>
    apiClient.post<ApiResponse<Supplier>>('/catalog/suppliers', req).then(unwrap),
  labelTemplates: () => apiClient.get<ApiResponse<LabelTemplate[]>>('/catalog/label-templates').then(unwrap),
  metalRateHistory: (params?: { metalId?: string; purityId?: string; fromDate?: string; toDate?: string; pageNumber?: number; pageSize?: number }) =>
    apiClient.get<ApiResponse<PagedResult<RateHistoryItem>>>('/catalog/metal-rates/history', { params }).then(unwrap),
}

// ── Inventory audits ──────────────────────────────────────────────────
export const inventoryAuditsApi = {
  list: (params?: { status?: InventoryAuditStatus; pageNumber?: number; pageSize?: number }) =>
    apiClient.get<ApiResponse<PagedResult<InventoryAuditListItem>>>('/inventoryaudits', { params }).then(unwrap),
  getById: (id: string) =>
    apiClient.get<ApiResponse<InventoryAuditReport>>(`/inventoryaudits/${id}`).then(unwrap),
}

// ── Tenants ───────────────────────────────────────────────────────────
export const tenantsApi = {
  list: () => apiClient.get<ApiResponse<unknown[]>>('/tenants').then(unwrap),
  getById: (id: string) => apiClient.get<ApiResponse<unknown>>(`/tenants/${id}`).then(unwrap),
  create: (req: object) => apiClient.post<ApiResponse<unknown>>('/tenants', req).then(unwrap),
  update: (id: string, req: object) => apiClient.put<ApiResponse<unknown>>(`/tenants/${id}`, req).then(unwrap),
}

// ── CRM: Leads ───────────────────────────────────────────────────────────
export const crmApi = {
  list: (params: {
    status?: LeadStatus; source?: LeadSource; searchTerm?: string; assignedToUserId?: string;
    hasOpenFollowUp?: boolean; pageNumber?: number; pageSize?: number
  }) => apiClient.get<ApiResponse<PagedResult<Lead>>>('/leads', { params }).then(unwrap),
  pipeline: () => apiClient.get<ApiResponse<CrmPipelineSummary[]>>('/leads/pipeline').then(unwrap),
  dueFollowUps: () => apiClient.get<ApiResponse<LeadFollowUp[]>>('/leads/due-followups').then(unwrap),
  followUpStats: () => apiClient.get<ApiResponse<FollowUpStats>>('/leads/followups/stats').then(unwrap),
  followUps: (params: {
    scope?: string; assignedToUserId?: string; type?: FollowUpType; searchTerm?: string;
    pageNumber?: number; pageSize?: number
  }) => apiClient.get<ApiResponse<PagedResult<LeadFollowUp>>>('/leads/followups', { params }).then(unwrap),
  getById: (id: string) => apiClient.get<ApiResponse<LeadDetail>>(`/leads/${id}`).then(unwrap),
  create: (req: CreateLeadRequest) => apiClient.post<ApiResponse<Lead>>('/leads', req).then(unwrap),
  update: (id: string, req: UpdateLeadRequest) => apiClient.put<ApiResponse<Lead>>(`/leads/${id}`, req).then(unwrap),
  delete: (id: string) => apiClient.delete<ApiResponse<boolean>>(`/leads/${id}`).then(unwrap),
  addFollowUp: (id: string, req: CreateLeadFollowUpRequest) =>
    apiClient.post<ApiResponse<LeadFollowUp>>(`/leads/${id}/followups`, req).then(unwrap),
  completeFollowUp: (followUpId: string, req: { outcome?: string; nextFollowUpDate?: string }) =>
    apiClient.patch<ApiResponse<LeadFollowUp>>(`/leads/followups/${followUpId}/complete`, req).then(unwrap),
  addNote: (id: string, req: CreateLeadNoteRequest) =>
    apiClient.post<ApiResponse<LeadNote>>(`/leads/${id}/notes`, req).then(unwrap),
  deleteNote: (leadId: string, noteId: string) =>
    apiClient.delete<ApiResponse<boolean>>(`/leads/${leadId}/notes/${noteId}`).then(unwrap),
  activities: (id: string) => apiClient.get<ApiResponse<LeadActivity[]>>(`/leads/${id}/activities`).then(unwrap),
  convert: (id: string, req: { email?: string; address?: string; city?: string; state?: string }) =>
    apiClient.post<ApiResponse<{ customerId: string; customerCode: string }>>(`/leads/${id}/convert`, req).then(unwrap),
}

// ── RBAC: Roles & Users (Phase 8) ────────────────────────────────────────
export const rolesApi = {
  list: () => apiClient.get<ApiResponse<Role[]>>('/roles').then(unwrap),
  getById: (id: string) => apiClient.get<ApiResponse<Role>>(`/roles/${id}`).then(unwrap),
  modules: () => apiClient.get<ApiResponse<{ modules: { value: number; name: string }[]; actions: { value: number; name: string }[] }>>('/roles/modules').then(unwrap),
  create: (req: CreateRoleRequest) => apiClient.post<ApiResponse<Role>>('/roles', req).then(unwrap),
  update: (id: string, req: UpdateRoleRequest) => apiClient.put<ApiResponse<Role>>(`/roles/${id}`, req).then(unwrap),
  delete: (id: string) => apiClient.delete<ApiResponse<boolean>>(`/roles/${id}`).then(unwrap),
}

export const usersApi = {
  list: () => apiClient.get<ApiResponse<TenantUserAccount[]>>('/users').then(unwrap),
  getById: (id: string) => apiClient.get<ApiResponse<TenantUserAccount>>(`/users/${id}`).then(unwrap),
  create: (req: CreateTenantUserRequest) => apiClient.post<ApiResponse<TenantUserAccount>>('/users', req).then(unwrap),
  update: (id: string, req: UpdateTenantUserRequest) => apiClient.put<ApiResponse<TenantUserAccount>>(`/users/${id}`, req).then(unwrap),
  resetPassword: (id: string, newPassword: string) =>
    apiClient.post<ApiResponse<boolean>>(`/users/${id}/reset-password`, { newPassword }).then(unwrap),
  delete: (id: string) => apiClient.delete<ApiResponse<boolean>>(`/users/${id}`).then(unwrap),
}

// ── Settings: Invoice template + Social credentials (Phase 4 / 9) ───────
export const settingsApi = {
  getInvoiceSettings: () => apiClient.get<ApiResponse<InvoiceSettings>>('/settings/invoice').then(unwrap),
  updateInvoiceSettings: (req: UpdateInvoiceSettingsRequest) =>
    apiClient.put<ApiResponse<InvoiceSettings>>('/settings/invoice', req).then(unwrap),
  uploadLogo: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return apiClient.post<ApiResponse<{ logoPath: string }>>('/settings/invoice/logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap)
  },
  getSocialSettings: () => apiClient.get<ApiResponse<SocialSettings>>('/settings/social').then(unwrap),
  updateGoogleSocial: (req: { accountName?: string; accountExternalId?: string; accessToken?: string; refreshToken?: string; clientId?: string; clientSecret?: string }) =>
    apiClient.put<ApiResponse<boolean>>('/settings/social/google', req).then(unwrap),
  updateInstagramSocial: (req: { accountName?: string; accountExternalId?: string; accessToken?: string }) =>
    apiClient.put<ApiResponse<boolean>>('/settings/social/instagram', req).then(unwrap),
}

// ── Payments: Razorpay (Phase 5) ─────────────────────────────────────────
export const paymentsApi = {
  createOrder: (invoiceId: string, amount?: number) =>
    apiClient.post<ApiResponse<RazorpayOrder>>('/payments/razorpay/order', { invoiceId, amount }).then(unwrap),
  verify: (req: { invoiceId: string; razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) =>
    apiClient.post<ApiResponse<{ id: string; status: InvoiceStatus; paidAmount: number; balanceAmount: number }>>('/payments/razorpay/verify', req).then(unwrap),
  createPaymentLink: (invoiceId: string, amount?: number) =>
    apiClient.post<ApiResponse<PaymentLink>>('/payments/razorpay/payment-link', { invoiceId, amount }).then(unwrap),
}

// ── Social: Google reviews + Instagram (Phase 9) ─────────────────────────
export const socialApi = {
  googleReviews: () => apiClient.get<ApiResponse<SocialReview[]>>('/social/google/reviews').then(unwrap),
  replyToReview: (reviewId: string, replyText: string) =>
    apiClient.post<ApiResponse<boolean>>('/social/google/reviews/reply', { reviewId, replyText }).then(unwrap),
  instagramPosts: () => apiClient.get<ApiResponse<SocialPost[]>>('/social/instagram/posts').then(unwrap),
  createInstagramPost: (req: { jewelleryItemId?: string; imageUrl: string; caption: string }) =>
    apiClient.post<ApiResponse<SocialPost>>('/social/instagram/posts', req).then(unwrap),
}
