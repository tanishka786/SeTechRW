using SeQrJewellery.Domain.Common;

namespace SeQrJewellery.Domain.Entities.Main;

public class Role : BaseEntity
{
    public Guid TenantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    /// <summary>System roles (seeded from UserRole enum) cannot be deleted.</summary>
    public bool IsSystemRole { get; set; } = false;

    public Tenant Tenant { get; set; } = null!;
    public ICollection<RolePermission> Permissions { get; set; } = new List<RolePermission>();
    public ICollection<UserRoleAssignment> UserAssignments { get; set; } = new List<UserRoleAssignment>();
}
