using SeQrJewellery.Domain.Common;
using SeQrJewellery.Domain.Enums;

namespace SeQrJewellery.Domain.Entities.Main;

public class RolePermission : BaseEntity
{
    public Guid RoleId { get; set; }
    public AppModule Module { get; set; }
    public PermissionAction Actions { get; set; } = PermissionAction.None;

    public Role Role { get; set; } = null!;
}
