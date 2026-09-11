using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Domain.Entities.Main;

namespace SeQrJewellery.Application.Interfaces;

public interface IMainDbContext
{
    DbSet<Tenant> Tenants { get; set; }
    DbSet<TenantConfiguration> TenantConfigurations { get; set; }
    DbSet<SystemConfiguration> SystemConfigurations { get; set; }
    DbSet<RFIDReaderProfile> RFIDReaderProfiles { get; set; }
    DbSet<TenantRFIDReader> TenantRFIDReaders { get; set; }
    DbSet<TenantUser> TenantUsers { get; set; }
    DbSet<Role> Roles { get; set; }
    DbSet<RolePermission> RolePermissions { get; set; }
    DbSet<UserRoleAssignment> UserRoleAssignments { get; set; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
