using SeQrJewellery.Domain.Common;

namespace SeQrJewellery.Domain.Entities.Main;

public class UserRoleAssignment : BaseEntity
{
    public Guid TenantUserId { get; set; }
    public Guid RoleId { get; set; }

    public TenantUser TenantUser { get; set; } = null!;
    public Role Role { get; set; } = null!;
}
