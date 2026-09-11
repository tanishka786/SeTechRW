using SeQrJewellery.Application.DTOs.Rbac;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Application.Interfaces;

public interface IPermissionService
{
    /// <summary>Computes effective module permissions for a tenant user (SuperAdmin/TenantAdmin get implicit full access).</summary>
    Task<UserPermissionsDto> GetPermissionsAsync(Guid tenantUserId, Guid tenantId, UserRole legacyRole, CancellationToken ct = default);

    /// <summary>Ensures a tenant has the default system roles (mirroring the UserRole enum) seeded.</summary>
    Task EnsureDefaultRolesAsync(Guid tenantId, CancellationToken ct = default);
}
