using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Domain.Entities.Main;

namespace SeQrJewellery.Infrastructure.Data;

public class MainDbContext : DbContext, IMainDbContext
{
    public MainDbContext(DbContextOptions<MainDbContext> options) : base(options) { }

    public DbSet<Tenant> Tenants { get; set; }
    public DbSet<TenantConfiguration> TenantConfigurations { get; set; }
    public DbSet<SystemConfiguration> SystemConfigurations { get; set; }
    public DbSet<RFIDReaderProfile> RFIDReaderProfiles { get; set; }
    public DbSet<TenantRFIDReader> TenantRFIDReaders { get; set; }
    public DbSet<TenantUser> TenantUsers { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<RolePermission> RolePermissions { get; set; }
    public DbSet<UserRoleAssignment> UserRoleAssignments { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Tenant>(e =>
        {
            e.HasIndex(t => t.Identifier).IsUnique();
            e.HasIndex(t => t.DatabaseName).IsUnique();
            e.Property(t => t.Name).HasMaxLength(200).IsRequired();
            e.Property(t => t.Identifier).HasMaxLength(100).IsRequired();
            e.Property(t => t.DatabaseName).HasMaxLength(200).IsRequired();
            e.Property(t => t.ConnectionString).HasMaxLength(1000).IsRequired();
            e.Property(t => t.BusinessName).HasMaxLength(300);
            e.Property(t => t.Currency).HasMaxLength(10);
            e.Property(t => t.CurrencySymbol).HasMaxLength(5);
        });

        modelBuilder.Entity<TenantConfiguration>(e =>
        {
            e.HasIndex(c => new { c.TenantId, c.Key }).IsUnique();
            e.Property(c => c.Key).HasMaxLength(200).IsRequired();
            e.HasOne(c => c.Tenant).WithMany(t => t.Configurations).HasForeignKey(c => c.TenantId);
        });

        modelBuilder.Entity<SystemConfiguration>(e =>
        {
            e.HasIndex(c => c.Key).IsUnique();
            e.Property(c => c.Key).HasMaxLength(200).IsRequired();
        });

        modelBuilder.Entity<RFIDReaderProfile>(e =>
        {
            e.Property(r => r.Name).HasMaxLength(200).IsRequired();
            e.Property(r => r.ModelNumber).HasMaxLength(100);
        });

        modelBuilder.Entity<TenantRFIDReader>(e =>
        {
            e.HasOne(r => r.Tenant).WithMany(t => t.RFIDReaders).HasForeignKey(r => r.TenantId);
            e.HasOne(r => r.RFIDReaderProfile).WithMany(p => p.TenantReaders).HasForeignKey(r => r.RFIDReaderProfileId);
        });

        modelBuilder.Entity<TenantUser>(e =>
        {
            e.HasIndex(u => new { u.TenantId, u.Username }).IsUnique();
            e.HasIndex(u => new { u.TenantId, u.Email }).IsUnique();
            e.Property(u => u.Username).HasMaxLength(100).IsRequired();
            e.Property(u => u.Email).HasMaxLength(200).IsRequired();
            e.HasOne(u => u.Tenant).WithMany(t => t.Users).HasForeignKey(u => u.TenantId);
        });

        modelBuilder.Entity<Role>(e =>
        {
            e.HasIndex(r => new { r.TenantId, r.Name }).IsUnique();
            e.Property(r => r.Name).HasMaxLength(100).IsRequired();
            e.HasOne(r => r.Tenant).WithMany().HasForeignKey(r => r.TenantId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RolePermission>(e =>
        {
            e.HasIndex(p => new { p.RoleId, p.Module }).IsUnique();
            e.HasOne(p => p.Role).WithMany(r => r.Permissions).HasForeignKey(p => p.RoleId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserRoleAssignment>(e =>
        {
            e.HasIndex(a => new { a.TenantUserId, a.RoleId }).IsUnique();
            // NoAction on user FK to avoid SQL Server multiple-cascade-path errors
            // (Tenant → TenantUsers CASCADE and Tenant → Roles CASCADE → Assignments).
            e.HasOne(a => a.TenantUser).WithMany().HasForeignKey(a => a.TenantUserId)
                .OnDelete(DeleteBehavior.NoAction);
            e.HasOne(a => a.Role).WithMany(r => r.UserAssignments).HasForeignKey(a => a.RoleId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Soft-delete filter
        modelBuilder.Entity<Tenant>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<TenantUser>().HasQueryFilter(e => !e.IsDeleted);
        modelBuilder.Entity<Role>().HasQueryFilter(e => !e.IsDeleted);
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
