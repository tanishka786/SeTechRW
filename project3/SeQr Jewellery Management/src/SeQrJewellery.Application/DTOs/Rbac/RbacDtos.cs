using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Application.DTOs.Rbac;

public class RoleDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsSystemRole { get; set; }
    public int UserCount { get; set; }
    public List<RolePermissionDto> Permissions { get; set; } = [];
}

public class RolePermissionDto
{
    public AppModule Module { get; set; }
    public PermissionAction Actions { get; set; }
}

public class CreateRoleRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<RolePermissionDto> Permissions { get; set; } = [];
}

public class UpdateRoleRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public List<RolePermissionDto>? Permissions { get; set; }
}

public class TenantUserDto
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public UserRole Role { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public List<string> RoleNames { get; set; } = [];
    public List<Guid> RoleIds { get; set; } = [];
    public DateTime CreatedAt { get; set; }
}

public class CreateTenantUserRequest
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public UserRole Role { get; set; } = UserRole.Staff;
    public List<Guid>? RoleIds { get; set; }
}

public class UpdateTenantUserRequest
{
    public string? Email { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Phone { get; set; }
    public UserRole? Role { get; set; }
    public bool? IsActive { get; set; }
    public List<Guid>? RoleIds { get; set; }
}

public class ResetPasswordRequest
{
    public string NewPassword { get; set; } = string.Empty;
}

/// <summary>Flattened effective permissions map keyed by module name, sent to the client at login.</summary>
public class UserPermissionsDto
{
    public bool IsSuperAdmin { get; set; }
    public bool IsTenantAdmin { get; set; }
    /// <summary>True when user can see/reassign all CRM leads (CRM Manage permission).</summary>
    public bool CanViewAllLeads { get; set; }
    public Dictionary<string, int> Modules { get; set; } = [];
}
