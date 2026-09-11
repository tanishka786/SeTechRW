using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Domain.Entities.Tenant;

namespace SeQrJewellery.Application.Interfaces;

public interface ITenantDbContext
{
    DbSet<Category> Categories { get; set; }
    DbSet<Metal> Metals { get; set; }
    DbSet<Purity> Purities { get; set; }
    DbSet<Supplier> Suppliers { get; set; }
    DbSet<JewelleryItem> JewelleryItems { get; set; }
    DbSet<JewelleryTag> JewelleryTags { get; set; }
    DbSet<ItemMedia> ItemMedia { get; set; }
    DbSet<Customer> Customers { get; set; }
    DbSet<Invoice> Invoices { get; set; }
    DbSet<InvoiceItem> InvoiceItems { get; set; }
    DbSet<InvoiceOldGoldItem> InvoiceOldGoldItems { get; set; }
    DbSet<Payment> Payments { get; set; }
    DbSet<StockMovement> StockMovements { get; set; }
    DbSet<PrintQueue> PrintQueues { get; set; }
    DbSet<AuditLog> AuditLogs { get; set; }
    DbSet<Employee> Employees { get; set; }
    DbSet<Repair> Repairs { get; set; }
    DbSet<RepairItem> RepairItems { get; set; }
    DbSet<MetalRate> MetalRates { get; set; }
    DbSet<LabelTemplate> LabelTemplates { get; set; }
    DbSet<InventoryAudit> InventoryAudits { get; set; }
    DbSet<InventoryAuditScan> InventoryAuditScans { get; set; }
    DbSet<InventoryAuditMissing> InventoryAuditMissings { get; set; }
    DbSet<Lead> Leads { get; set; }
    DbSet<LeadFollowUp> LeadFollowUps { get; set; }
    DbSet<InvoiceSettings> InvoiceSettings { get; set; }
    DbSet<SocialAccount> SocialAccounts { get; set; }
    DbSet<SocialPost> SocialPosts { get; set; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
