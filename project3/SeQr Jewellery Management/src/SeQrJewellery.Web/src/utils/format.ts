import { format, parseISO, isValid } from 'date-fns'
import {
  InvoiceStatus, InvoiceType, PrintStatus, RepairStatus, TagType, PaymentMethod, CustomerType, InventoryAuditStatus, InventoryAuditScanOutcome,
  LeadStatus, LeadSource, FollowUpType, SocialPlatform, SocialPostStatus,
} from '../types'

export const fmtCurrency = (amount: number, symbol = '₹') =>
  `${symbol}${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const fmtWeight = (grams: number) => `${grams.toFixed(3)}g`
export const fmtCarat = (ct: number) => `${ct.toFixed(ct % 1 === 0 ? 0 : 2)}ct`

export function fmtStoneSpecs(item: {
  stoneCarat?: number | null; stoneCut?: string; stoneClarity?: string; stoneColor?: string;
  certificateLab?: string; certificateNumber?: string; stoneSpecs?: string
}): string | null {
  if (item.stoneSpecs) return item.stoneSpecs
  const parts: string[] = []
  if (item.stoneCarat && item.stoneCarat > 0) parts.push(fmtCarat(item.stoneCarat))
  if (item.stoneCut) parts.push(item.stoneCut)
  if (item.stoneClarity) parts.push(item.stoneClarity)
  if (item.stoneColor) parts.push(item.stoneColor)
  const lab = item.certificateLab?.trim()
  const id = item.certificateNumber?.trim()
  if (lab || id) {
    const cert = lab && id && !id.toUpperCase().startsWith(lab.toUpperCase()) ? `${lab} ${id}` : (id || lab)
    if (cert) parts.push(`· ${cert}`)
  }
  return parts.length ? parts.join(' ') : null
}
export const fmtDate = (d?: string) => { if (!d) return '—'; try { return format(parseISO(d), 'dd/MM/yyyy') } catch { return d } }
export const fmtDateTime = (d?: string) => { if (!d) return '—'; try { return format(parseISO(d), 'dd/MM/yyyy HH:mm') } catch { return d } }

export const invoiceStatusLabel: Record<InvoiceStatus, string> = {
  [InvoiceStatus.Draft]: 'Draft', [InvoiceStatus.Confirmed]: 'Confirmed',
  [InvoiceStatus.PartiallyPaid]: 'Partial', [InvoiceStatus.Paid]: 'Paid',
  [InvoiceStatus.Cancelled]: 'Cancelled', [InvoiceStatus.Refunded]: 'Refunded',
}
export const invoiceStatusColor: Record<InvoiceStatus, string> = {
  [InvoiceStatus.Draft]: 'bg-gray-100 text-gray-600',
  [InvoiceStatus.Confirmed]: 'bg-blue-100 text-blue-700',
  [InvoiceStatus.PartiallyPaid]: 'bg-amber-100 text-amber-700',
  [InvoiceStatus.Paid]: 'bg-green-100 text-green-700',
  [InvoiceStatus.Cancelled]: 'bg-red-100 text-red-700',
  [InvoiceStatus.Refunded]: 'bg-purple-100 text-purple-700',
}

export const invoiceTypeLabel: Record<InvoiceType, string> = {
  [InvoiceType.Sale]: 'Sale', [InvoiceType.Purchase]: 'Purchase',
  [InvoiceType.Return]: 'Return', [InvoiceType.Consignment]: 'Consignment', [InvoiceType.Repair]: 'Repair',
}

export const printStatusLabel: Record<PrintStatus, string> = {
  [PrintStatus.Pending]: 'Pending', [PrintStatus.Printing]: 'Printing',
  [PrintStatus.Completed]: 'Completed', [PrintStatus.Failed]: 'Failed', [PrintStatus.Cancelled]: 'Cancelled',
}
export const printStatusColor: Record<PrintStatus, string> = {
  [PrintStatus.Pending]: 'bg-yellow-100 text-yellow-700',
  [PrintStatus.Printing]: 'bg-blue-100 text-blue-700',
  [PrintStatus.Completed]: 'bg-green-100 text-green-700',
  [PrintStatus.Failed]: 'bg-red-100 text-red-700',
  [PrintStatus.Cancelled]: 'bg-gray-100 text-gray-600',
}

export const repairStatusLabel: Record<RepairStatus, string> = {
  [RepairStatus.Received]: 'Received', [RepairStatus.InProgress]: 'In Progress',
  [RepairStatus.ReadyForPickup]: 'Ready', [RepairStatus.Delivered]: 'Delivered',
  [RepairStatus.Cancelled]: 'Cancelled', [RepairStatus.OnHold]: 'On Hold',
}
export const repairStatusColor: Record<RepairStatus, string> = {
  [RepairStatus.Received]: 'bg-blue-100 text-blue-700',
  [RepairStatus.InProgress]: 'bg-amber-100 text-amber-700',
  [RepairStatus.ReadyForPickup]: 'bg-green-100 text-green-700',
  [RepairStatus.Delivered]: 'bg-gray-100 text-gray-600',
  [RepairStatus.Cancelled]: 'bg-red-100 text-red-700',
  [RepairStatus.OnHold]: 'bg-purple-100 text-purple-700',
}

export const tagTypeLabel: Record<TagType, string> = {
  [TagType.Barcode]: 'Barcode', [TagType.RFID]: 'RFID', [TagType.QRCode]: 'QR Code',
}

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  [PaymentMethod.Cash]: 'Cash', [PaymentMethod.Card]: 'Card', [PaymentMethod.BankTransfer]: 'Bank Transfer',
  [PaymentMethod.Cheque]: 'Cheque', [PaymentMethod.GoldExchange]: 'Gold Exchange',
  [PaymentMethod.OldJewellery]: 'Old Jewellery', [PaymentMethod.UPI]: 'UPI',
  [PaymentMethod.CryptoCurrency]: 'Crypto', [PaymentMethod.Other]: 'Other',
}

export const customerTypeColor: Record<CustomerType, string> = {
  [CustomerType.Retail]: 'bg-gray-100 text-gray-700',
  [CustomerType.Wholesale]: 'bg-blue-100 text-blue-700',
  [CustomerType.Corporate]: 'bg-purple-100 text-purple-700',
  [CustomerType.VIP]: 'bg-amber-100 text-amber-800',
}
export const customerTypeLabel: Record<CustomerType, string> = {
  [CustomerType.Retail]: 'Retail', [CustomerType.Wholesale]: 'Wholesale',
  [CustomerType.Corporate]: 'Corporate', [CustomerType.VIP]: 'VIP',
}

export const inventoryAuditStatusLabel: Record<InventoryAuditStatus, string> = {
  [InventoryAuditStatus.InProgress]: 'In Progress',
  [InventoryAuditStatus.Completed]: 'Completed',
  [InventoryAuditStatus.Cancelled]: 'Cancelled',
}
export const inventoryAuditStatusColor: Record<InventoryAuditStatus, string> = {
  [InventoryAuditStatus.InProgress]: 'bg-amber-100 text-amber-700',
  [InventoryAuditStatus.Completed]: 'bg-green-100 text-green-700',
  [InventoryAuditStatus.Cancelled]: 'bg-gray-100 text-gray-600',
}

export const inventoryAuditOutcomeLabel: Record<InventoryAuditScanOutcome, string> = {
  [InventoryAuditScanOutcome.Matched]: 'Matched',
  [InventoryAuditScanOutcome.Extra]: 'Extra',
  [InventoryAuditScanOutcome.Unmapped]: 'Unmapped',
  [InventoryAuditScanOutcome.Sold]: 'Sold',
}
export const inventoryAuditOutcomeColor: Record<InventoryAuditScanOutcome, string> = {
  [InventoryAuditScanOutcome.Matched]: 'bg-green-100 text-green-700',
  [InventoryAuditScanOutcome.Extra]: 'bg-blue-100 text-blue-700',
  [InventoryAuditScanOutcome.Unmapped]: 'bg-amber-100 text-amber-700',
  [InventoryAuditScanOutcome.Sold]: 'bg-purple-100 text-purple-700',
}

export const cn = (...classes: (string | undefined | false | null)[]) =>
  classes.filter(Boolean).join(' ')

// ── CRM (Phase 7) ─────────────────────────────────────────────────────
export const leadStatusLabel: Record<LeadStatus, string> = {
  [LeadStatus.New]: 'New', [LeadStatus.Contacted]: 'Contacted', [LeadStatus.Interested]: 'Interested',
  [LeadStatus.Negotiating]: 'Negotiating', [LeadStatus.Won]: 'Won', [LeadStatus.Lost]: 'Lost',
}
export const leadStatusColor: Record<LeadStatus, string> = {
  [LeadStatus.New]: 'bg-gray-100 text-gray-700', [LeadStatus.Contacted]: 'bg-blue-100 text-blue-700',
  [LeadStatus.Interested]: 'bg-amber-100 text-amber-700', [LeadStatus.Negotiating]: 'bg-purple-100 text-purple-700',
  [LeadStatus.Won]: 'bg-green-100 text-green-700', [LeadStatus.Lost]: 'bg-red-100 text-red-700',
}
export const leadSourceLabel: Record<LeadSource, string> = {
  [LeadSource.WalkIn]: 'Walk-in', [LeadSource.Referral]: 'Referral', [LeadSource.Online]: 'Online',
  [LeadSource.Phone]: 'Phone', [LeadSource.SocialMedia]: 'Social Media', [LeadSource.Other]: 'Other',
}
export const followUpTypeLabel: Record<FollowUpType, string> = {
  [FollowUpType.Call]: 'Call', [FollowUpType.Visit]: 'Visit', [FollowUpType.WhatsApp]: 'WhatsApp',
  [FollowUpType.Email]: 'Email', [FollowUpType.Other]: 'Other',
}
export const leadActivityLabel: Record<number, string> = {
  1: 'Created', 2: 'Status Changed', 3: 'Assigned', 4: 'Note Added',
  5: 'Follow-up Scheduled', 6: 'Follow-up Completed', 7: 'Converted', 8: 'Updated', 9: 'Deleted',
}

// ── Social (Phase 9) ──────────────────────────────────────────────────
export const socialPlatformLabel: Record<SocialPlatform, string> = {
  [SocialPlatform.Google]: 'Google', [SocialPlatform.Instagram]: 'Instagram', [SocialPlatform.Facebook]: 'Facebook',
}
export const socialPostStatusLabel: Record<SocialPostStatus, string> = {
  [SocialPostStatus.Draft]: 'Draft', [SocialPostStatus.Queued]: 'Queued',
  [SocialPostStatus.Published]: 'Published', [SocialPostStatus.Failed]: 'Failed',
}
export const socialPostStatusColor: Record<SocialPostStatus, string> = {
  [SocialPostStatus.Draft]: 'bg-gray-100 text-gray-600', [SocialPostStatus.Queued]: 'bg-blue-100 text-blue-700',
  [SocialPostStatus.Published]: 'bg-green-100 text-green-700', [SocialPostStatus.Failed]: 'bg-red-100 text-red-700',
}
