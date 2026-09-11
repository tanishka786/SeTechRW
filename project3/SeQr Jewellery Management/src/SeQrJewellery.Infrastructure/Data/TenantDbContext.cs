using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Domain.Entities.Tenant;

namespace SeQrJewellery.Infrastructure.Data;

public class TenantDbContext : DbContext, ITenantDbContext
{
    public TenantDbContext(DbContextOptions<TenantDbContext> options) : base(options) { }

    public DbSet<Category> Categories { get; set; }
    public DbSet<Metal> Metals { get; set; }
    public DbSet<Purity> Purities { get; set; }
    public DbSet<Supplier> Suppliers { get; set; }
    public DbSet<JewelleryItem> JewelleryItems { get; set; }
    public DbSet<JewelleryTag> JewelleryTags { get; set; }
    public DbSet<ItemMedia> ItemMedia { get; set; }
    public DbSet<Customer> Customers { get; set; }
    public DbSet<Invoice> Invoices { get; set; }
    public DbSet<InvoiceItem> InvoiceItems { get; set; }
    public DbSet<InvoiceOldGoldItem> InvoiceOldGoldItems { get; set; }
    public DbSet<Payment> Payments { get; set; }
    public DbSet<StockMovement> StockMovements { get; set; }
    public DbSet<PrintQueue> PrintQueues { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<Employee> Employees { get; set; }
    public DbSet<Repair> Repairs { get; set; }
    public DbSet<RepairItem> RepairItems { get; set; }
    public DbSet<MetalRate> MetalRates { get; set; }
    public DbSet<LabelTemplate> LabelTemplates { get; set; }
    public DbSet<InventoryAudit> InventoryAudits { get; set; }
    public DbSet<InventoryAuditScan> InventoryAuditScans { get; set; }
    public DbSet<InventoryAuditMissing> InventoryAuditMissings { get; set; }
    public DbSet<Lead> Leads { get; set; }
    public DbSet<LeadFollowUp> LeadFollowUps { get; set; }
    public DbSet<LeadNote> LeadNotes { get; set; }
    public DbSet<LeadActivity> LeadActivities { get; set; }
    public DbSet<InvoiceSettings> InvoiceSettings { get; set; }
    public DbSet<SocialAccount> SocialAccounts { get; set; }
    public DbSet<SocialPost> SocialPosts { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Category>(e =>
        {
            e.Property(c => c.Name).HasMaxLength(200).IsRequired();
            e.HasOne(c => c.ParentCategory).WithMany(c => c.SubCategories)
                .HasForeignKey(c => c.ParentCategoryId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Metal>(e =>
        {
            e.Property(m => m.Name).HasMaxLength(100).IsRequired();
            e.Property(m => m.Symbol).HasMaxLength(5);
            e.Property(m => m.CurrentMarketRate).HasPrecision(18, 4);
        });

        modelBuilder.Entity<Purity>(e =>
        {
            e.Property(p => p.Name).HasMaxLength(50).IsRequired();
            e.Property(p => p.PurityPercentage).HasPrecision(5, 2);
            e.HasOne(p => p.Metal).WithMany(m => m.Purities).HasForeignKey(p => p.MetalId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Supplier>(e =>
        {
            e.Property(s => s.Name).HasMaxLength(300).IsRequired();
        });

        modelBuilder.Entity<JewelleryItem>(e =>
        {
            e.HasIndex(i => i.SKU).IsUnique();
            e.Property(i => i.SKU).HasMaxLength(50).IsRequired();
            e.Property(i => i.Name).HasMaxLength(300).IsRequired();
            e.Property(i => i.GrossWeight).HasPrecision(10, 3);
            e.Property(i => i.NetWeight).HasPrecision(10, 3);
            e.Property(i => i.StoneWeight).HasPrecision(10, 3);
            e.Property(i => i.MetalRate).HasPrecision(18, 4);
            e.Property(i => i.MetalValue).HasPrecision(18, 2);
            e.Property(i => i.MakingCharges).HasPrecision(18, 2);
            e.Property(i => i.MakingChargesPercent).HasPrecision(18, 4);
            e.Property(i => i.MakingChargeValue).HasPrecision(18, 4);
            e.Property(i => i.StoneCharges).HasPrecision(18, 2);
            e.Property(i => i.OtherCharges).HasPrecision(18, 2);
            e.Property(i => i.Discount).HasPrecision(18, 2);
            e.Property(i => i.TaxAmount).HasPrecision(18, 2);
            e.Property(i => i.SellingPrice).HasPrecision(18, 2);
            e.Property(i => i.CostPrice).HasPrecision(18, 2);

            e.HasOne(i => i.Category).WithMany(c => c.JewelleryItems).HasForeignKey(i => i.CategoryId)
                .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(i => i.Metal).WithMany(m => m.JewelleryItems).HasForeignKey(i => i.MetalId)
                .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(i => i.Purity).WithMany(p => p.JewelleryItems).HasForeignKey(i => i.PurityId)
                .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(i => i.Supplier).WithMany(s => s.JewelleryItems).HasForeignKey(i => i.SupplierId)
                .IsRequired(false).OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<JewelleryTag>(e =>
        {
            e.HasIndex(t => t.BarcodeValue).IsUnique();
            e.HasIndex(t => t.ReferenceNumber).IsUnique().HasFilter("[ReferenceNumber] IS NOT NULL");
            e.HasIndex(t => t.QRCodeValue).IsUnique().HasFilter("[QRCodeValue] IS NOT NULL");
            e.HasIndex(t => t.EPC).IsUnique().HasFilter("[EPC] IS NOT NULL");
            e.HasIndex(t => t.EPCHex).IsUnique().HasFilter("[EPCHex] IS NOT NULL");
            e.Property(t => t.BarcodeValue).HasMaxLength(200).IsRequired();
            e.Property(t => t.QRCodeValue).HasMaxLength(200);
            e.Property(t => t.EPC).HasMaxLength(50);
            e.Property(t => t.EPCHex).HasMaxLength(100);
            e.HasOne(t => t.JewelleryItem)
                .WithMany(i => i.Tags)
                .HasForeignKey(t => t.JewelleryItemId)
                .IsRequired(false)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ItemMedia>(e =>
        {
            e.ToTable("ItemMedia");
            e.Property(m => m.FileName).HasMaxLength(300).IsRequired();
            e.Property(m => m.ContentType).HasMaxLength(100).IsRequired();
            e.Property(m => m.StoragePath).HasMaxLength(500).IsRequired();
            e.HasIndex(m => m.JewelleryItemId);
            e.HasOne(m => m.JewelleryItem)
                .WithMany(i => i.Media)
                .HasForeignKey(m => m.JewelleryItemId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Customer>(e =>
        {
            e.HasIndex(c => c.CustomerCode).IsUnique();
            e.Property(c => c.CustomerCode).HasMaxLength(20).IsRequired();
            e.Property(c => c.FirstName).HasMaxLength(100).IsRequired();
            e.Property(c => c.LastName).HasMaxLength(100);
            e.Property(c => c.TotalPurchaseAmount).HasPrecision(18, 2);
        });

        modelBuilder.Entity<Invoice>(e =>
        {
            e.HasIndex(i => i.InvoiceNumber).IsUnique();
            e.Property(i => i.InvoiceNumber).HasMaxLength(50).IsRequired();
            e.Property(i => i.SubTotal).HasPrecision(18, 2);
            e.Property(i => i.TotalDiscount).HasPrecision(18, 2);
            e.Property(i => i.TotalTax).HasPrecision(18, 2);
            e.Property(i => i.TotalAmount).HasPrecision(18, 2);
            e.Property(i => i.PaidAmount).HasPrecision(18, 2);
            e.Property(i => i.BalanceAmount).HasPrecision(18, 2);
            e.Property(i => i.CGST).HasPrecision(18, 2);
            e.Property(i => i.SGST).HasPrecision(18, 2);
            e.Property(i => i.IGST).HasPrecision(18, 2);

            e.HasOne(i => i.Customer).WithMany(c => c.Invoices).HasForeignKey(i => i.CustomerId).IsRequired(false);
            e.HasOne(i => i.Supplier).WithMany(s => s.Invoices).HasForeignKey(i => i.SupplierId).IsRequired(false);
        });

        modelBuilder.Entity<InvoiceOldGoldItem>(e =>
        {
            e.ToTable("InvoiceOldGoldItems");
            e.Property(x => x.Description).HasMaxLength(300);
            e.Property(x => x.GrossWeight).HasPrecision(10, 3);
            e.Property(x => x.PurityPercent).HasPrecision(6, 2);
            e.Property(x => x.XrfPurityPercent).HasPrecision(6, 2);
            e.Property(x => x.MeltingLossPercent).HasPrecision(6, 2);
            e.Property(x => x.BuyingRatePerGram).HasPrecision(18, 4);
            e.Property(x => x.FineWeight).HasPrecision(10, 3);
            e.Property(x => x.PayableWeight).HasPrecision(10, 3);
            e.Property(x => x.CreditAmount).HasPrecision(18, 2);
            e.HasOne(x => x.Invoice).WithMany(i => i.OldGoldItems).HasForeignKey(x => x.InvoiceId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<InvoiceItem>(e =>
        {
            e.Property(i => i.GrossWeight).HasPrecision(10, 3);
            e.Property(i => i.NetWeight).HasPrecision(10, 3);
            e.Property(i => i.MetalRate).HasPrecision(18, 4);
            e.Property(i => i.MetalValue).HasPrecision(18, 2);
            e.Property(i => i.MakingCharges).HasPrecision(18, 2);
            e.Property(i => i.UnitPrice).HasPrecision(18, 2);
            e.Property(i => i.TotalPrice).HasPrecision(18, 2);
            e.HasOne(i => i.Invoice).WithMany(inv => inv.Items).HasForeignKey(i => i.InvoiceId)
                .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(i => i.JewelleryItem).WithMany(j => j.InvoiceItems).HasForeignKey(i => i.JewelleryItemId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Payment>(e =>
        {
            e.Property(p => p.Amount).HasPrecision(18, 2);
            e.HasOne(p => p.Invoice).WithMany(i => i.Payments).HasForeignKey(p => p.InvoiceId);
        });

        modelBuilder.Entity<StockMovement>(e =>
        {
            e.HasOne(s => s.JewelleryItem).WithMany(i => i.StockMovements).HasForeignKey(s => s.JewelleryItemId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<PrintQueue>(e =>
        {
            e.HasOne(p => p.JewelleryItem).WithMany(i => i.PrintQueues).HasForeignKey(p => p.JewelleryItemId)
                .IsRequired(false).OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<Repair>(e =>
        {
            e.HasIndex(r => r.RepairOrderNumber).IsUnique();
            e.Property(r => r.RepairOrderNumber).HasMaxLength(50).IsRequired();
            e.Property(r => r.EstimatedCost).HasPrecision(18, 2);
            e.Property(r => r.ActualCost).HasPrecision(18, 2);
            e.HasOne(r => r.Customer).WithMany(c => c.Repairs).HasForeignKey(r => r.CustomerId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<RepairItem>(e =>
        {
            e.Property(r => r.EstimatedCost).HasPrecision(18, 2);
            e.Property(r => r.ActualCost).HasPrecision(18, 2);
            e.HasOne(r => r.Repair).WithMany(rep => rep.RepairItems).HasForeignKey(r => r.RepairId);
        });

        modelBuilder.Entity<MetalRate>(e =>
        {
            e.Property(r => r.RatePerGram).HasPrecision(18, 4);
            e.Property(r => r.RatePerTola).HasPrecision(18, 4);
            e.Property(r => r.RatePerOz).HasPrecision(18, 4);
            e.Property(r => r.PreviousRate).HasPrecision(18, 4);
            e.Property(r => r.UpdatedByUserName).HasMaxLength(200);
            e.HasOne(r => r.Metal).WithMany().HasForeignKey(r => r.MetalId)
                .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(r => r.Purity).WithMany().HasForeignKey(r => r.PurityId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<InventoryAudit>(e =>
        {
            e.ToTable("InventoryAudits");
            e.Property(a => a.StartedBy).HasMaxLength(200).IsRequired();
            e.Property(a => a.Notes).HasMaxLength(1000);
        });

        modelBuilder.Entity<InventoryAuditScan>(e =>
        {
            e.ToTable("InventoryAuditScans");
            e.Property(s => s.EPCHex).HasMaxLength(100).IsRequired();
            e.HasIndex(s => new { s.AuditId, s.EPCHex }).IsUnique();
            e.HasOne(s => s.Audit).WithMany(a => a.Scans).HasForeignKey(s => s.AuditId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<InventoryAuditMissing>(e =>
        {
            e.ToTable("InventoryAuditMissing");
            e.Property(m => m.BarcodeValue).HasMaxLength(200);
            e.Property(m => m.EPCHex).HasMaxLength(100);
            e.Property(m => m.Reason).HasMaxLength(50).IsRequired();
            e.HasOne(m => m.Audit).WithMany(a => a.Missing).HasForeignKey(m => m.AuditId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Lead>(e =>
        {
            e.HasIndex(l => l.LeadCode).IsUnique();
            e.HasIndex(l => l.AssignedToUserId);
            e.Property(l => l.LeadCode).HasMaxLength(20).IsRequired();
            e.Property(l => l.FirstName).HasMaxLength(100).IsRequired();
            e.Property(l => l.LastName).HasMaxLength(100);
            e.Property(l => l.AssignedToUserName).HasMaxLength(200);
            e.Property(l => l.Occasion).HasMaxLength(200);
            e.Property(l => l.Budget).HasPrecision(18, 2);
            e.HasOne(l => l.ConvertedCustomer).WithMany().HasForeignKey(l => l.ConvertedCustomerId)
                .IsRequired(false).OnDelete(DeleteBehavior.NoAction);
        });

        modelBuilder.Entity<LeadFollowUp>(e =>
        {
            e.HasIndex(f => f.ScheduledAt);
            e.Property(f => f.CreatedByUserName).HasMaxLength(200);
            e.HasOne(f => f.Lead).WithMany(l => l.FollowUps).HasForeignKey(f => f.LeadId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LeadNote>(e =>
        {
            e.Property(n => n.Content).HasMaxLength(4000).IsRequired();
            e.Property(n => n.CreatedByUserName).HasMaxLength(200);
            e.HasOne(n => n.Lead).WithMany(l => l.LeadNotes).HasForeignKey(n => n.LeadId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<LeadActivity>(e =>
        {
            e.HasIndex(a => a.OccurredAt);
            e.Property(a => a.Summary).HasMaxLength(500).IsRequired();
            e.Property(a => a.PerformedByUserName).HasMaxLength(200);
            e.HasOne(a => a.Lead).WithMany(l => l.Activities).HasForeignKey(a => a.LeadId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<InvoiceSettings>(e =>
        {
            e.Property(s => s.ShopName).HasMaxLength(300);
        });

        modelBuilder.Entity<SocialAccount>(e =>
        {
            e.Property(s => s.AccountName).HasMaxLength(200);
        });

        modelBuilder.Entity<SocialPost>(e =>
        {
            e.HasOne(p => p.JewelleryItem).WithMany().HasForeignKey(p => p.JewelleryItemId)
                .IsRequired(false).OnDelete(DeleteBehavior.NoAction);
        });

        // Soft-delete filters
        modelBuilder.Entity<JewelleryItem>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Customer>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Invoice>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Supplier>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Lead>().HasQueryFilter(e => !e.IsDeleted);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.Entity is Domain.Common.BaseEntity entity)
            {
                if (entry.State == EntityState.Modified)
                    entity.UpdatedAt = DateTime.UtcNow;
            }
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}
