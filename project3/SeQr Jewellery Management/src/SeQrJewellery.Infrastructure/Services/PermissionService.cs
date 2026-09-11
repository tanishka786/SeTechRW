using Microsoft.EntityFrameworkCore;
using SeQrJewellery.Application.DTOs.Rbac;
using SeQrJewellery.Application.Interfaces;
using SeQrJewellery.Domain.Entities.Main;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Infrastructure.Services;

public class PermissionService : IPermissionService
{
    private readonly IMainDbContext _db;

    public PermissionService(IMainDbContext db)
    {
        _db = db;
    }

    /// <summary>Default module access per system UserRole, used both as a fallback and to seed Role/RolePermission rows.</summary>
    public static readonly Dictionary<UserRole, PermissionAction> DefaultRoleAccess = new()
    {
        [UserRole.SuperAdmin] = PermissionAction.All,
        [UserRole.TenantAdmin] = PermissionAction.All,
        [UserRole.Manager] = PermissionAction.View | PermissionAction.Create | PermissionAction.Edit | PermissionAction.Manage,
        [UserRole.Staff] = PermissionAction.View | PermissionAction.Create | PermissionAction.Edit,
        [UserRole.ReadOnly] = PermissionAction.View,
    };

    private static readonly AppModule[] AllModules = Enum.GetValues<AppModule>();

    public async Task<UserPermissionsDto> GetPermissionsAsync(Guid tenantUserId, Guid tenantId, UserRole legacyRole, CancellationToken ct = default)
    {
        var dto = new UserPermissionsDto
        {
            IsSuperAdmin = legacyRole == UserRole.SuperAdmin,
            IsTenantAdmin = legacyRole == UserRole.TenantAdmin,
        };

        if (dto.IsSuperAdmin || dto.IsTenantAdmin)
        {
            foreach (var module in AllModules)
                dto.Modules[module.ToString()] = (int)PermissionAction.All;
            dto.CanViewAllLeads = true;
            return dto;
        }

        var assignedRoleIds = await _db.UserRoleAssignments
            .Where(a => a.TenantUserId == tenantUserId)
            .Select(a => a.RoleId)
            .ToListAsync(ct);

        if (assignedRoleIds.Count > 0)
        {
            var permissions = await _db.RolePermissions
                .Where(p => assignedRoleIds.Contains(p.RoleId))
                .ToListAsync(ct);

            foreach (var module in AllModules)
            {
                var combined = permissions
                    .Where(p => p.Module == module)
                    .Aggregate(PermissionAction.None, (acc, p) => acc | p.Actions);
                dto.Modules[module.ToString()] = (int)combined;
            }

            dto.CanViewAllLeads = HasCrmManage(dto);
            return dto;
        }

        // Fallback to legacy UserRole-based defaults when no explicit role rows exist yet.
        var fallback = DefaultRoleAccess.GetValueOrDefault(legacyRole, PermissionAction.View);
        foreach (var module in AllModules)
            dto.Modules[module.ToString()] = (int)fallback;

        // Managers see all leads; Staff/Sales see only own
        dto.CanViewAllLeads = legacyRole is UserRole.Manager or UserRole.SuperAdmin or UserRole.TenantAdmin;
        return dto;
    }

    public async Task EnsureDefaultRolesAsync(Guid tenantId, CancellationToken ct = default)
    {
        var existing = await _db.Roles.Where(r => r.TenantId == tenantId && r.IsSystemRole).Select(r => r.Name).ToListAsync(ct);

        foreach (var roleEnum in Enum.GetValues<UserRole>())
        {
            var name = roleEnum.ToString();
            if (existing.Contains(name)) continue;

            var role = new Role
            {
                TenantId = tenantId,
                Name = name,
                Description = $"System role: {name}",
                IsSystemRole = true,
            };

            var access = DefaultRoleAccess.GetValueOrDefault(roleEnum, PermissionAction.View);
            foreach (var module in AllModules)
            {
                role.Permissions.Add(new RolePermission { Module = module, Actions = access });
            }

            await _db.Roles.AddAsync(role, ct);
        }

        // CRM-specific sales roles
        await EnsureCrmSalesRolesAsync(tenantId, existing, ct);

        await _db.SaveChangesAsync(ct);
    }

    private async Task EnsureCrmSalesRolesAsync(Guid tenantId, List<string> existingSystemNames, CancellationToken ct)
    {
        if (!existingSystemNames.Contains("SalesAdmin"))
        {
            var salesAdmin = new Role
            {
                TenantId = tenantId,
                Name = "SalesAdmin",
                Description = "Sales admin — can view and manage all users' CRM leads",
                IsSystemRole = true,
            };
            foreach (var module in AllModules)
            {
                var actions = module == AppModule.Crm
                    ? PermissionAction.All
                    : module is AppModule.Dashboard or AppModule.Customers or AppModule.Inventory
                        ? PermissionAction.View | PermissionAction.Create | PermissionAction.Edit
                        : PermissionAction.View;
                salesAdmin.Permissions.Add(new RolePermission { Module = module, Actions = actions });
            }
            await _db.Roles.AddAsync(salesAdmin, ct);
        }

        if (!existingSystemNames.Contains("Sales"))
        {
            var sales = new Role
            {
                TenantId = tenantId,
                Name = "Sales",
                Description = "Sales user — can only see and manage their own CRM leads",
                IsSystemRole = true,
            };
            foreach (var module in AllModules)
            {
                var actions = module == AppModule.Crm
                    ? PermissionAction.View | PermissionAction.Create | PermissionAction.Edit
                    : module is AppModule.Dashboard or AppModule.Customers or AppModule.Inventory
                        ? PermissionAction.View | PermissionAction.Create
                        : PermissionAction.None;
                if (actions != PermissionAction.None)
                    sales.Permissions.Add(new RolePermission { Module = module, Actions = actions });
                else
                    sales.Permissions.Add(new RolePermission { Module = module, Actions = PermissionAction.None });
            }
            await _db.Roles.AddAsync(sales, ct);
        }
    }

    public static bool HasCrmManage(UserPermissionsDto permissions)
    {
        if (permissions.IsSuperAdmin || permissions.IsTenantAdmin) return true;
        if (permissions.Modules.TryGetValue(nameof(AppModule.Crm), out var actions))
            return ((PermissionAction)actions & PermissionAction.Manage) == PermissionAction.Manage;
        return false;
    }
}
